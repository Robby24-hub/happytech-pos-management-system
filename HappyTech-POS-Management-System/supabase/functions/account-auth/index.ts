import { createClient } from 'npm:@supabase/supabase-js@2'
const url = Deno.env.get('SUPABASE_URL')!
const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{autoRefreshToken:false,persistSession:false}})
const publicClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {auth:{autoRefreshToken:false,persistSession:false}})
const cors = {'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') || 'http://localhost:5173', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS'}
const reply = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
const bad = () => reply({error:'Invalid account or PIN, or account temporarily locked.'},401)
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors})
 if(req.method!=='POST')return reply({error:'Method not allowed'},405)
 try {
 const body=await req.json();
 if(body.action==='login') {
   const id=body.accountId, pin=body.pin
   if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id)||!/^\d{4}$/.test(pin))return bad()
   // Public account selection needs a strict IP-based limiter at the edge gateway / WAF as well.
   const {data:valid,error:e} = await service.rpc('verify_login_pin',{p_user_id:id,p_pin:pin})
   if(e||valid!==true)return bad()
   const {data:record,error:rerr}=await service.auth.admin.getUserById(id)
   if(rerr||!record.user?.email)return bad()
   const {data:link,error:lerr}=await service.auth.admin.generateLink({type:'magiclink',email:record.user.email})
   if(lerr || !link.properties?.hashed_token)return reply({error:'Could not create session'},500)
   await service.from('system_logs').insert({actor_id:id,action:'login_success'})
   return reply({token_hash:link.properties.hashed_token})
 }
 const auth=req.headers.get('Authorization')||''
 const token=auth.replace(/^Bearer\s+/i,'')
 const {data:{user},error:authError}=await publicClient.auth.getUser(token)
 if(authError||!user)return reply({error:'Unauthorized'},401)
 const {data:profile}=await service.from('profiles').select('role,active,must_change_pin').eq('id',user.id).single()
 if(!profile?.active)return reply({error:'Account inactive'},403)
 if(body.action==='change-pin') {
   if(!/^\d{4}$/.test(body.newPin||''))return reply({error:'A 4-digit PIN is required'},400)
   const {error}=await service.rpc('set_account_pin',{p_user_id:user.id,p_pin:body.newPin})
   if(error)throw error
   await service.from('profiles').update({must_change_pin:false}).eq('id',user.id)
   await service.from('system_logs').insert({actor_id:user.id,action:'pin_changed'})
   return reply({ok:true})
 }
 if(body.action==='list-admins') {
   if(profile.role!=='Super Admin')return reply({error:'Forbidden'},403)
   const {data,error}=await service.from('profiles').select('id,name,email,avatar_url,active,created_at').eq('role','Admin').order('name')
   if(error)throw error
   return reply({admins:data})
 }
 if(body.action==='set-admin-status') {
   if(profile.role!=='Super Admin'||profile.must_change_pin)return reply({error:'Forbidden'},403)
   if(typeof body.accountId!=='string'||typeof body.active!=='boolean')return reply({error:'Invalid request'},400)
   const {data:target,error:targetError}=await service.from('profiles').select('id,role,active').eq('id',body.accountId).single()
   if(targetError||target?.role!=='Admin')return reply({error:'Admin not found'},404)
   const {error:updateError}=await service.from('profiles').update({active:body.active}).eq('id',target.id)
   if(updateError)throw updateError
   // All protected Edge Function calls check the active flag. Existing Auth access tokens
   // may remain valid until expiration; other APIs must enforce active status as well.
   await service.from('system_logs').insert({actor_id:user.id,target_id:target.id,action:body.active?'admin_activated':'admin_deactivated'})
   return reply({ok:true})
 }
 if(body.action==='create-account') {
   const role=body.role
   if(!((profile.role==='Admin'&&role==='Cashier')||(profile.role==='Super Admin'&&role==='Admin')))return reply({error:'Forbidden'},403)
   if(profile.must_change_pin)return reply({error:'Change your own PIN first'},403)
   if(typeof body.name!=='string'||!body.name.trim()||body.name.length>120)return reply({error:'Valid name required'},400)
   if(!/^\d{4}$/.test(body.tempPin||''))return reply({error:'Temporary PIN must be 4 digits'},400)
   // Cashier accounts use internal non-routable identifiers; Admin accounts require a real email.
   if(role==='Admin' && (typeof body.email!=='string'||!/^\S+@\S+\.\S+$/.test(body.email)))return reply({error:'Admin email required'},400)
   const email=role==='Cashier'?`cashier-${crypto.randomUUID()}@cashier.happytech.example.com`:body.email.trim().toLowerCase()
   const {data:created,error:createError}=await service.auth.admin.createUser({email,email_confirmed:true,password:crypto.randomUUID()+crypto.randomUUID()})
   if(createError||!created.user)return reply({error:createError?.message||'Account creation failed'},400)
   const id=created.user.id
   try {
     let avatarUrl=null
     if(body.avatarDataUrl) {
       if(typeof body.avatarDataUrl!=='string'||body.avatarDataUrl.length>550000)throw new Error('Profile picture must be smaller than 400 KB')
       const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.avatarDataUrl)
       if(!match)throw new Error('Only PNG, JPG, and WebP images are supported')
       const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0))
       if(bytes.length>400000)throw new Error('Image exceeds 400 KB')
       const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[match[1]]
       const key=`${id}.${ext}`
       const {error:uploadError}=await service.storage.from('account-avatars').upload(key,bytes,{contentType:match[1],upsert:false})
       if(uploadError)throw uploadError
       avatarUrl=service.storage.from('account-avatars').getPublicUrl(key).data.publicUrl
     }
     const {error:pe}=await service.from('profiles').insert({id,name:body.name.trim(),role,email:role==='Admin'?email:null,avatar_url:avatarUrl,must_change_pin:true})
     if(pe)throw pe
     const {error:ce}=await service.rpc('set_account_pin',{p_user_id:id,p_pin:body.tempPin})
     if(ce)throw ce
   }catch(e){await service.auth.admin.deleteUser(id);throw e}
   await service.from('system_logs').insert({actor_id:user.id,target_id:id,action:'account_created'})
   return reply({id})
 }
 return reply({error:'Unknown action'},400)
 } catch(e){console.error(e);return reply({error:'Could not complete request'},500)}
})
