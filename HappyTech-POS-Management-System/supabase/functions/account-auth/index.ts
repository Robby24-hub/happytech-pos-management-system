import { createClient } from 'npm:@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL')!
const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{autoRefreshToken:false,persistSession:false}})
const publicClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {auth:{autoRefreshToken:false,persistSession:false}})
const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') || 'http://localhost:5173',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (body:unknown, status=200) => new Response(JSON.stringify(body), {status, headers:{...cors,'Content-Type':'application/json'}})
const denied = () => reply({error:'Invalid account or PIN, or account temporarily locked.'},401)
const pinValid = (value:unknown) => typeof value==='string' && /^\d{4}$/.test(value)
const uuidValid = (value:unknown) => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

type Audit = {
  actor_id?: string|null; actor_name?: string|null; actor_role?: string|null;
  target_id?: string|null; target_name?: string|null; target_role?: string|null;
  action: string; reason?: string|null;
}
const audit = async (event: Audit) => {
  const {error} = await service.from('system_logs').insert(event)
  if(error) console.error('Audit insert failure',error.message)
  // Do not print PINs, tokens or secrets to Edge Function logs.
}
const selfVerified = async (userId:string,pin:unknown) => {
  if(!pinValid(pin))return false
  const {data,error} = await service.rpc('verify_login_pin',{p_user_id:userId,p_pin:pin})
  return !error && data===true
}
const uploadAvatar = async (id:string, dataUrl:unknown) => {
  if(!dataUrl)return null
  if(typeof dataUrl!=='string'||dataUrl.length>550000)throw new Error('Profile photo must be smaller than 400 KB')
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if(!match)throw new Error('Only PNG, JPG and WebP images are supported')
  const bytes=Uint8Array.from(atob(match[2]), c=>c.charCodeAt(0))
  if(bytes.length>400000)throw new Error('Profile photo exceeds 400 KB')
  const ext=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'} as Record<string,string>)[match[1]]
  const key=`${id}.${ext}`
  const {error}=await service.storage.from('account-avatars').upload(key,bytes,{contentType:match[1],upsert:false})
  if(error)throw error
  return service.storage.from('account-avatars').getPublicUrl(key).data.publicUrl
}

Deno.serve(async(req) => {
  if(req.method==='OPTIONS')return new Response(null,{headers:cors})
  if(req.method!=='POST')return reply({error:'Method not allowed'},405)
  try {
    const body=await req.json()
    if(!body||typeof body!=='object')return reply({error:'Invalid request'},400)
    if(body.action==='login') {
      const id=body.accountId, pin=body.pin
      if(!uuidValid(id)||!pinValid(pin))return denied()
      const {data:target} = await service.from('profiles').select('name,role,active').eq('id',id).maybeSingle()
      const valid = await selfVerified(id,pin)
      if(!valid){
        if(target)await audit({action:'login_failed',actor_id:null,target_id:id,target_name:target.name,target_role:target.role})
        return denied()
      }
      const {data:record,error:rerr}=await service.auth.admin.getUserById(id)
      if(rerr||!record.user?.email)return denied()
      const {data:link,error:lerr}=await service.auth.admin.generateLink({type:'magiclink',email:record.user.email})
      if(lerr||!link.properties?.hashed_token)return reply({error:'Could not create session'},500)
      await audit({action:'login_success',actor_id:id,actor_name:target?.name,actor_role:target?.role})
      return reply({token_hash:link.properties.hashed_token})
    }

    // -- The Edge Function always verifies bearer JWTs for protected actions. --
    const header=req.headers.get('Authorization')||''
    const bearer=header.match(/^Bearer\s+(.+)$/i)?.[1]
    if(!bearer)return reply({error:'Unauthorized'},401)
    const {data:{user},error:authError}=await publicClient.auth.getUser(bearer)
    if(authError||!user)return reply({error:'Unauthorized'},401)
    const {data:profile}=await service.from('profiles').select('id,name,role,active,must_change_pin').eq('id',user.id).maybeSingle()
    if(!profile?.active)return reply({error:'Account inactive'},403)
    const actor={actor_id:user.id,actor_name:profile.name,actor_role:profile.role}

    if(body.action==='change-pin') {
      if(!pinValid(body.newPin))return reply({error:'A four-digit PIN is required'},400)
      const {error}=await service.rpc('set_account_pin',{p_user_id:user.id,p_pin:body.newPin})
      if(error)throw error
      const {error:updateError}=await service.from('profiles').update({must_change_pin:false}).eq('id',user.id)
      if(updateError)throw updateError
      await audit({...actor,action:'pin_changed'})
      return reply({ok:true})
    }
    // Prevent use of administrative actions before the mandatory PIN change.
    if(profile.must_change_pin)return reply({error:'Change your temporary PIN first'},403)

    if(body.action==='logout') {
      await audit({...actor,action:'logout'})
      return reply({ok:true})
    }

    if(body.action==='list-activity') {
      if(!['Admin','Super Admin'].includes(profile.role))return reply({error:'Forbidden'},403)
      const limit = Math.min(Math.max(Number(body.limit)||100,1),150)
      let query=service.from('system_logs').select('id,created_at,actor_name,actor_role,target_name,target_role,action,reason').order('created_at',{ascending:false}).limit(limit)
      if(profile.role==='Admin')query=query.or(`actor_id.eq.${user.id},actor_role.eq.Cashier,target_role.eq.Cashier`)
      const {data,error}=await query
      if(error)throw error
      return reply({logs:data})
    }

    if(body.action==='list-admins'||body.action==='list-cashiers') {
      const isAdmin=body.action==='list-admins'
      if((isAdmin&&profile.role!=='Super Admin')||(!isAdmin&&profile.role!=='Admin'))return reply({error:'Forbidden'},403)
      const {data,error}=await service.from('profiles').select('id,name,email,avatar_url,active,created_at').eq('role',isAdmin?'Admin':'Cashier').order('name')
      if(error)throw error
      return reply(isAdmin?{admins:data}:{cashiers:data})
    }

    if(body.action==='set-admin-status'||body.action==='set-cashier-status') {
      const targetRole=body.action==='set-admin-status'?'Admin':'Cashier'
      if((targetRole==='Admin'&&profile.role!=='Super Admin')||(targetRole==='Cashier'&&profile.role!=='Admin'))return reply({error:'Forbidden'},403)
      if(!uuidValid(body.accountId)||typeof body.active!=='boolean')return reply({error:'Invalid request'},400)
      const {data:target}=await service.from('profiles').select('id,name,role,active').eq('id',body.accountId).maybeSingle()
      if(!target||target.role!==targetRole)return reply({error:'Account not found'},404)
      if(target.active===body.active)return reply({ok:true})
      const {error}=await service.from('profiles').update({active:body.active}).eq('id',target.id)
      if(error)throw error
      await audit({...actor,target_id:target.id,target_name:target.name,target_role:target.role,action:`${targetRole.toLowerCase()}_${body.active?'activated':'deactivated'}`})
      return reply({ok:true})
    }

    if(body.action==='create-account') {
      const role=body.role
      if(!((profile.role==='Admin'&&role==='Cashier')||(profile.role==='Super Admin'&&role==='Admin')))return reply({error:'Forbidden'},403)
      if(typeof body.name!=='string'||body.name.trim().length<2||body.name.length>120)return reply({error:'Full name is required (2–120 characters)'},400)
      if(!pinValid(body.tempPin))return reply({error:'Temporary PIN must have four digits'},400)
      if(role==='Admin' && (typeof body.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())))return reply({error:'Valid Admin email required'},400)
      const email=role==='Cashier'?`cashier-${crypto.randomUUID()}@cashier.happytech.example.com`:body.email.trim().toLowerCase()
      const {data:created,error:createError}=await service.auth.admin.createUser({email,email_confirmed:true,password:crypto.randomUUID()+crypto.randomUUID()})
      if(createError||!created.user)return reply({error:createError?.message||'Account creation failed'},400)
      const id=created.user.id
      try {
        const avatarUrl=await uploadAvatar(id,body.avatarDataUrl)
        const {error:pe}=await service.from('profiles').insert({id,name:body.name.trim(),role,email:role==='Admin'?email:null,avatar_url:avatarUrl,must_change_pin:true})
        if(pe)throw pe
        const {error:ce}=await service.rpc('set_account_pin',{p_user_id:id,p_pin:body.tempPin})
        if(ce)throw ce
      } catch(e) {
        await service.auth.admin.deleteUser(id)
        throw e
      }
      await audit({...actor,target_id:id,target_name:body.name.trim(),target_role:role,action:'account_created'})
      return reply({id})
    }

    if(body.action==='reset-cashier-pin') {
      if(profile.role!=='Admin')return reply({error:'Forbidden'},403)
      if(!uuidValid(body.accountId)||!pinValid(body.newPin))return reply({error:'Invalid request'},400)
      const {data:target}=await service.from('profiles').select('id,name,role,active').eq('id',body.accountId).maybeSingle()
      if(!target||target.role!=='Cashier')return reply({error:'Cashier not found'},404)
      if(!await selfVerified(user.id,body.managerPin))return reply({error:'Admin PIN verification failed or account temporarily locked'},401)
      const {error:pinError}=await service.rpc('set_account_pin',{p_user_id:target.id,p_pin:body.newPin})
      if(pinError)throw pinError
      const {error:profileError}=await service.from('profiles').update({must_change_pin:true}).eq('id',target.id)
      if(profileError)throw profileError
      await audit({...actor,target_id:target.id,target_name:target.name,target_role:target.role,action:'cashier_pin_reset'})
      return reply({ok:true})
    }

    if(body.action==='delete-account') {
      if(!['Super Admin','Admin'].includes(profile.role))return reply({error:'Forbidden'},403)
      if(!uuidValid(body.accountId)||body.accountId===user.id)return reply({error:'Invalid target account'},400)
      if(typeof body.reason!=='string'||body.reason.trim().length<10||body.reason.length>500)return reply({error:'Deletion reason must be 10–500 characters'},400)
      const expectedRole=profile.role==='Super Admin'?'Admin':'Cashier'
      const {data:target}=await service.from('profiles').select('id,name,role,avatar_url').eq('id',body.accountId).maybeSingle()
      if(!target||target.role!==expectedRole)return reply({error:'Account not found or not permitted'},404)
      // Verifying the manager PIN on the server also applies the existing failed-attempt lockout.
      if(!await selfVerified(user.id,body.managerPin))return reply({error:'Manager PIN verification failed or account temporarily locked'},401)
      const {error:deleteError}=await service.auth.admin.deleteUser(target.id)
      if(deleteError)throw deleteError
      // FK ON DELETE SET NULL preserves existing audit rows; snapshots survive deletion.
      await audit({...actor,action:`${expectedRole.toLowerCase()}_deleted`,target_name:target.name,target_role:target.role,reason:body.reason.trim()})
      if(target.avatar_url){
        try {
          const filename=new URL(target.avatar_url).pathname.split('/').pop()
          if(filename)await service.storage.from('account-avatars').remove([decodeURIComponent(filename)])
        }catch(e){ console.error('Could not remove deleted account avatar', e) }
      }
      return reply({ok:true})
    }

    return reply({error:'Unknown action'},400)
  } catch(e) {
    console.error(e)
    return reply({error:'Could not complete request. Check Edge Function logs.'},500)
  }
})
