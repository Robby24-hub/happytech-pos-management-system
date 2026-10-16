-- Apply after 202610170002_account_audit_and_deletion.sql.
-- Short-lived, single-use recovery grants: opaque tokens are ONLY returned once;
-- hashed grant tokens and PIN hashes are stored server-side, never PIN plaintext.
create table if not exists public.pin_recovery_grants (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  kind text not null check (kind in ('cashier','email')),
  actor_id uuid references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists pin_recovery_grants_expires_at_idx on public.pin_recovery_grants(expires_at);
alter table public.pin_recovery_grants enable row level security;
revoke all on public.pin_recovery_grants from anon, authenticated;

-- Everything (authorization, redemption, PIN hash update, audit insert) is
-- performed in one PostgreSQL transaction. Parallel use of the same grant is
-- serialized with FOR UPDATE; the first successful redemption consumes it.
create or replace function public.complete_pin_recovery(
  p_token_hash text, p_kind text, p_pin text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  g public.pin_recovery_grants%rowtype;
  target_profile public.profiles%rowtype;
  actor_profile public.profiles%rowtype;
begin
  if p_pin !~ '^[0-9]{4}$' or p_kind not in ('cashier','email')
     or p_token_hash is null or length(p_token_hash) <> 64 then
    return false;
  end if;
  select * into g from public.pin_recovery_grants
  where token_hash = p_token_hash and kind = p_kind for update;
  if not found or g.used_at is not null or g.expires_at <= now() then
    return false;
  end if;
  select * into target_profile from public.profiles where id=g.target_id and active=true for update;
  if not found then return false; end if;
  if p_kind='email' then
    if target_profile.role not in ('Admin','Super Admin') or g.actor_id is distinct from g.target_id then return false; end if;
    actor_profile := target_profile;
  else
    if target_profile.role <> 'Cashier' or g.actor_id is null then return false; end if;
    select * into actor_profile from public.profiles where id=g.actor_id and active=true and role='Admin';
    if not found or actor_profile.must_change_pin then return false; end if;
  end if;
  -- This updates the bcrypt hash and clears the failed-login lockout.
  perform public.set_account_pin(g.target_id,p_pin);
  update public.profiles set must_change_pin=false where id=g.target_id;
  update public.pin_recovery_grants set used_at=now() where id=g.id;
  -- Invalidate all other outstanding grants for this account.
  delete from public.pin_recovery_grants where target_id=g.target_id and id<>g.id;
  insert into public.system_logs(actor_id,actor_name,actor_role,target_id,target_name,target_role,action)
  values (actor_profile.id,actor_profile.name,actor_profile.role,
          target_profile.id,target_profile.name,target_profile.role,
          case when p_kind='email' then 'email_pin_recovery_success' else 'cashier_forgot_pin_reset' end);
  return true;
end $$;
revoke all on function public.complete_pin_recovery(text,text,text) from public, anon, authenticated;
grant execute on function public.complete_pin_recovery(text,text,text) to service_role;

-- Public list of active admins for the assisted-Cashier recovery chooser.
-- No credentials, emails, or other private profile data are returned.
create or replace function public.list_recovery_admins()
returns table(id uuid, name text, avatar_url text)
language sql security definer set search_path = '' as $$
  select p.id,p.name,p.avatar_url from public.profiles p
  where p.active = true and p.role='Admin' and p.must_change_pin=false order by p.name;
$$;
revoke all on function public.list_recovery_admins() from public;
grant execute on function public.list_recovery_admins() to anon, authenticated;

-- Role is fetched to choose the right recovery UI, but is NEVER trusted for
-- authorization. The login screen still displays only name and picture.
drop function if exists public.list_login_accounts();
create function public.list_login_accounts()
returns table(id uuid, name text, avatar_url text, role text)
language sql security definer set search_path = '' as $$
  select p.id,p.name,p.avatar_url,p.role from public.profiles p where p.active=true order by p.name;
$$;
revoke all on function public.list_login_accounts() from public;
grant execute on function public.list_login_accounts() to anon, authenticated;

-- Refresh PostgREST after changing the public account chooser function return shape.
notify pgrst, 'reload schema';
