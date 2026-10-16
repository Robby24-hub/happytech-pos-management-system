-- HappyTech initial authentication tables. Apply using Supabase SQL editor.
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  avatar_url text,
  role text not null check (role in ('Cashier','Admin','Super Admin')),
  active boolean not null default true,
  must_change_pin boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.account_credentials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pin_hash text not null,
  failures integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.system_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  target_id uuid references public.profiles(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.account_credentials enable row level security;
alter table public.system_logs enable row level security;
-- Public account chooser lists names and avatars only through a restricted RPC, not a full table scan.
revoke all on public.profiles from anon;
revoke all on public.account_credentials from anon, authenticated;
revoke all on public.system_logs from anon, authenticated;
create policy profile_self_select on public.profiles for select to authenticated using (id = auth.uid());
create or replace function public.list_login_accounts()
returns table(id uuid, name text, avatar_url text)
language sql security definer set search_path = '' as $$
  select p.id, p.name, p.avatar_url from public.profiles p where p.active = true order by p.name;
$$;
revoke all on function public.list_login_accounts() from public;
grant execute on function public.list_login_accounts() to anon, authenticated;
-- Serialized failed-attempt counters, checked under a row lock.
create or replace function public.verify_login_pin(p_user_id uuid, p_pin text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare c public.account_credentials%rowtype;
begin
  select * into c from public.account_credentials where user_id=p_user_id for update;
  if not found or c.locked_until > now() then return false; end if;
  if p_pin ~ '^[0-9]{4}$' and c.pin_hash = extensions.crypt(p_pin, c.pin_hash)
     and exists (select 1 from public.profiles where id=p_user_id and active=true) then
    update public.account_credentials set failures=0, locked_until=null where user_id=p_user_id;
    return true;
  end if;
  update public.account_credentials set failures=c.failures+1,
    locked_until=case when c.failures+1 >= 5 then now() + interval '15 minutes' else null end
    where user_id=p_user_id;
  return false;
end $$;
revoke all on function public.verify_login_pin(uuid,text) from public, anon, authenticated;
grant execute on function public.verify_login_pin(uuid,text) to service_role;
-- Service-only function for creating a strong PIN hash.
create or replace function public.set_account_pin(p_user_id uuid,p_pin text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_pin !~ '^[0-9]{4}$' then raise exception 'PIN must be four digits'; end if;
  insert into public.account_credentials(user_id,pin_hash,failures,locked_until,updated_at)
  values (p_user_id,extensions.crypt(p_pin,extensions.gen_salt('bf',12)),0,null,now())
  on conflict(user_id) do update set pin_hash=excluded.pin_hash,failures=0,locked_until=null,updated_at=now();
end $$;
revoke all on function public.set_account_pin(uuid,text) from public, anon, authenticated;
grant execute on function public.set_account_pin(uuid,text) to service_role;
