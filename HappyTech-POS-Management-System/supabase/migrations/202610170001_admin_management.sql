-- Apply after 202610160001_accounts.sql in the Supabase SQL Editor.
-- Emails are limited to admins (cashiers have internal synthetic auth identities).
alter table public.profiles add column if not exists email text;
update public.profiles p set email = u.email
from auth.users u where p.id = u.id and p.role in ('Admin','Super Admin') and p.email is null;
create unique index if not exists profiles_admin_email_unique
on public.profiles (lower(email)) where email is not null;
-- Account chooser avatars are intentionally public; NEVER upload credentials or sensitive images.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('account-avatars','account-avatars',true,400000,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true,file_size_limit=400000,allowed_mime_types=array['image/png','image/jpeg','image/webp'];
-- No client upload policy: uploads run only inside role-checked Edge Function.
