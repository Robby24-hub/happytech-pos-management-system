# HappyTech authentication foundation

**Updated October 17, 2026:** Account Management and cloud security Activity Logs are now included in this branch. See **`ACCOUNT_SECURITY_SETUP.md`** for the latest SQL migration and deployment order. The original first-run instructions below remain for new installations only.

This branch replaces the frontend-only demo role selector with a Supabase-backed account selector and PIN authentication. It does **not** migrate POS sales, inventory, Admin Settings cashier management, logs, or Super Admin management into Supabase yet. Do not deploy this build as a production POS until those workflows are connected and tested.

## First run

1. Create a Supabase project. Copy `.env.example` to `.env.local`, enter **project URL** and **publishable/anon key**, never a `service_role` key. Restart Vite after editing `.env.local`.
2. Run `supabase/migrations/202610160001_accounts.sql` in the project's SQL editor. Review policies before using in production.
3. In Supabase Auth settings, enable email login and ensure the site URL and redirect URL include your deployed HTTPS site or `http://localhost:5173` for development. Review email templates and SMTP limits.
4. Deploy the Edge Function `account-auth`: `supabase functions deploy account-auth --no-verify-jwt`. **The function must perform its own JWT verification** on every authenticated action; anonymous login is intentionally permitted. Set function secret `APP_ORIGIN` to your frontend origin. Supabase project-managed `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` must be available in Edge Functions, never the browser.
5. Run `npm install`, `npm run dev`.

## Bootstrap first Super Admin

Use the Supabase Dashboard Authentication > Users interface to create an account with a verified mailbox and a long random password. Copy its UUID. Then run in SQL Editor, substituting the user UUID and a temporary four-digit PIN (do not share PINs in public screenshots or commit them):

```sql
insert into public.profiles (id,name,role,active,must_change_pin)
values ('REPLACE_UUID','System Administrator','Super Admin',true,true);
select public.set_account_pin('REPLACE_UUID','REPLACE_PIN');
```

The login chooser lists the account; use the PIN to sign in. The account will be forced to choose a new PIN. Do not leave a temporary credential in documentation or source code.

## What remains before a real rollout

- Account management, Account PIN changes, and security audit display now have Cloud-backed implementations; **deploy the newest migration and `account-auth` Edge Function** before using them.
- Admin recovery emails, a fully verified email-to-PIN recovery flow, rate limiting by IP and device, image-content verification, stronger session revocation, and transactional audit durability still require further work.
- POS sales, inventory, product reports, and backup/restoration remain browser mock data. Cloud business-data migration and offline transaction synchronization are separate later phases.
- Account hard deletion is for disposable test users only at present; archive accounts with real sales or other legally required records instead.

## Important limitations

The names and photos of active users are intentionally visible on the shared-device account chooser. Protect access to the kiosk and consider limiting the list to an enrolled device in production. The current 4-digit PIN verifier locks an account after five failures for 15 minutes, which alone is **not** sufficient against distributed abuse. Require additional IP/device limits before deployment.

The existing application still uses `localStorage` for business-data mocks. `seedUsers` contains demonstration PINs that are unrelated to and **never used by** the new Supabase login path; remove those mock credentials when account-management screens are migrated.
