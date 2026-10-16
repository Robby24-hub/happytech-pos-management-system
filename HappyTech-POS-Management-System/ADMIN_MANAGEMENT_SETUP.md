> **Update:** This was the previous Admin Management setup guide. For the newer Cashier Management, Delete/Reason/PIN, and Cloud Activity Logs version, follow `ACCOUNT_SECURITY_SETUP.md` and the `202610170002_account_audit_and_deletion.sql` migration.

# HappyTech – Supabase Admin Management setup

This update builds on the working account selector, Super Admin login, and first-time PIN change. It does NOT replace sales/inventory browser mock data, cashier account UI, system log UI, or PIN recovery.

## Apply the update (in order)

1. Check you are on your intended Git branch and commit or back up your prior work. Copy the updated files into the repository, preserving your existing `.git` and `.env.local`.
2. Supabase Dashboard > SQL Editor: run `supabase/migrations/202610170001_admin_management.sql` once. The earlier `202610160001_accounts.sql` should already have been applied. The new migration adds an email column and a public `account-avatars` Storage bucket.
3. In the VS Code terminal (linked to the correct project), deploy the updated function: `npx supabase functions deploy account-auth --no-verify-jwt`. Keep `APP_ORIGIN` set to the exact Vite origin (`http://localhost:5173` if pinned).
4. Run `npm install` and `npm run dev` if needed; refresh browser.
5. Sign in as Super Admin. Go to **Admin Management**, create an Admin with name, real email, optional image smaller than 400 KB, and a random temporary 4-digit PIN.
6. Sign out; select the newly created Admin on the account chooser. Enter the temporary PIN and confirm the required first-time PIN change. Verify redirection to the Admin dashboard.
7. Return as Super Admin. Verify the new Admin appears, test deactivate/reactivate, and verify that inactive accounts disappear from the account chooser after refresh.

## Security and completeness notes

- Frontend uses the Supabase publishable/anon key. Do not place secret/service-role keys in frontend environment variables.
- `create-account`, `list-admins`, and `set-admin-status` use server-side role checks. The browser never calls `auth.admin.createUser` directly.
- Uploaded avatars are publicly viewable in the `account-avatars` bucket, intended for the shared-device chooser. Do not upload private ID documents. The function validates MIME type and size, but production systems should also inspect file signatures and scan/transform images.
- Temporary PINs are manually chosen and delivered privately. The UI does not send an invitation email or automated secure PIN delivery.
- Deactivating an Admin blocks custom account-auth protected actions and removes the account from the chooser. Access through other APIs must additionally enforce the `active` state; existing Supabase Auth tokens may remain valid until expiration. Production rollout requires session revocation design and testing.
- 4-digit PIN login remains vulnerable to distributed attempts without gateway/IP-based limits; the original 5-failures account lock is not sufficient for production.
- The Edge Function was deployed with `--no-verify-jwt`, and performs its own JWT verification for protected actions. Review with your security team before production.
- The previous Admin Settings > Cashier Accounts, Super Admin system log display, cash register and stock flows remain mock only.
- The app retains the original development warning strip.
