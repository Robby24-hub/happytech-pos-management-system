# HappyTech — Account Management & Cloud Audit Update

This update works with the **existing working Supabase login**. The downloaded ZIP deliberately excludes `.git`, `.env.local`, and `node_modules` to avoid overwriting your branch/credentials. Do not delete your original `.git` folder.

## Deploy in this order

1. On your GitHub feature branch, copy the updated `src/`, `supabase/functions/account-auth/index.ts`, and migration into the project. Keep `.git`, `.env.local`, and any unrelated local work.
2. In Supabase Dashboard > SQL Editor, execute the entire `supabase/migrations/202610170002_account_audit_and_deletion.sql` file, **after the two existing migrations**. It adds audit identity snapshots and deletion reasons to `system_logs` and backfills historical log names where possible. Do not rerun the old bootstrap account creation SQL.
3. In your VS Code project terminal, run:

   ```powershell
   npx supabase functions deploy account-auth --no-verify-jwt
   ```

   `APP_ORIGIN` should still be `http://localhost:5173` if you kept Vite fixed to that port.
4. Run `npm install` and `npm run dev`, then sign into the existing Super Admin account.

## Test sequence

1. Super Admin > **Admin Management**: confirm **+ Create Admin** appears above the table and opens a modal. Create a test Admin with a real email and temporary PIN. Confirm the new account appears at login and is prompted to change their PIN.
2. Sign into that Admin. In **Settings > Cashier Accounts**, create a test Cashier with name, optional photo, and temporary PIN. Confirm the first-login PIN change works.
3. In Admin Settings > Cashier Accounts, test **Reset PIN**. Enter your **Admin PIN** (not the Cashier's), plus the new temporary Cashier PIN twice. Confirm the Cashier must change it at next login.
4. Test **Activate/Deactivate** on both account types. Deactivated accounts must disappear from the login chooser and be rejected by protected Edge Function calls.
5. Test deletion **only on a disposable test account**: click Delete, enter a reason of at least 10 characters, enter **your own manager PIN**, check the warning and confirm. Confirm the account disappears and a deletion record with actor, affected account, and reason remains visible in Activity Logs.
6. Open **Activity Logs** in both Super Admin and Admin sidebars. Verify successful and failed logins, creation, activation, deactivation, PIN changes/resets, logout, and deletion records. Super Admin views all security logs; Admin views their own activity and Cashier-related activity.

## Permission matrix

| Operation | Super Admin | Admin | Cashier |
| --- | --- | --- | --- |
| Create, activate, deactivate, delete Admin | Yes | No | No |
| Create, activate, deactivate, delete Cashier | No | Yes | No |
| Reset Cashier PIN with own PIN | No | Yes | No |
| View security audit logs | All | Own and Cashier-related | No |

## Important limitations / operational safety

- **Hard deletion is irreversible** and intended for test accounts at this stage. It deletes the Supabase Auth user and dependent profile/credential rows. Audit snapshots and the supplied reason are retained. Do not delete accounts with important real sales or reporting history; production transaction systems should archive/deactivate staff instead of hard-deleting identities. The current sales and inventory are still mock data.
- The server checks signed-in identity and role, re-verifies the manager's PIN for deletions and Cashier PIN resets, and logs sensitive actions. PIN values are never written to audit records. However, there is **no IP/device-based rate limiter** here, and a 4-digit PIN plus a per-user lockout is insufficient for production. Configure gateway rate-limiting and security monitoring before rollout.
- This version logs **authentication/account security events**, not the current mocked POS sales or inventory operations. Cloud sales and inventory logging will come with their database migration.
- Account status enforcement in the Edge Function does not automatically revoke an already-open frontend session everywhere. Recheck profile status in other future backend APIs and use RLS; consider short session lifetimes and forced sign-out for production.
- Admin email recovery remains an earlier-stage implementation. Recovery messages and PIN-reset authorization require end-to-end review before production.
- Uploaded profile photos are public to support the shared-device account chooser. Do not upload sensitive photographs.

## Files modified/added

- `src/pages/AccountManagement.jsx` **new** shared create/list/status/delete/Pin-reset UI and confirmation modals.
- `src/pages/AdminManagement.jsx` replaced old inline form with reusable managed list.
- `src/pages/CashierManagement.jsx` **new** cloud Cashier management for Admin Settings.
- `src/pages/ActivityLogs.jsx` **new** secure log viewer.
- `src/pages/SuperDashboard.jsx` connects summary and recent activity to Supabase.
- `src/pages/Settings.jsx` replaces mock Cashier CRUD; My Account PIN update is now cloud-backed (name-edit remains unavailable).
- `src/App.jsx` adds Admin Activity Logs navigation and logout audit event.
- `src/lib/supabase.js` surfaces Edge Function response errors.
- `src/index.css` adds matching modal/table/delete-warning styles.
- `supabase/functions/account-auth/index.ts` adds cloud listing/status/deletion/manager-PIN reset/audits with role verification.
- `supabase/migrations/202610170002_account_audit_and_deletion.sql` **new** audit snapshot/reason schema.

No `.env.local`, CLI token, Supabase secret, private credentials, or `.git` data are included.
