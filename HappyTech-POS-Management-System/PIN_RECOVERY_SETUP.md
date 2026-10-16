# HappyTech — PIN Recovery and Responsive Login Update

## What this update actually changes

- **Cashier:** Select Cashier account → **Forgot PIN?** → select an active Admin and enter that Admin's PIN → choose and confirm the Cashier's new PIN → back to account selection. The Admin PIN is verified through the server-side, lockout-protected credential checker. Cashier recovery cannot access the email recovery endpoint.
- **Admin/Super Admin:** Select account → **Forgot PIN?** → request recovery email → click verified, single-use Supabase **recovery** link → choose and confirm new PIN → back to account selection. Normal login sessions and magic-link tokens cannot authorize this recovery process.
- Both flows use five-minute, single-use, server-issued recovery grants. A PostgreSQL function atomically consumes the grant, changes the hashed PIN, unlocks the account, and writes a PIN-free activity log row.
- Existing login, initial forced PIN change, account creation/deletion, activation/deactivation and logging actions remain intact.
- Responsive account-selection and PIN login style adjustments for tablet portrait/landscape and desktop. Account chooser may scroll *inside its own grid* if dozens of accounts exceed the viewport; the page body should not scroll at common target sizes.
- Removes stale demo PIN fields from browser-persisted mock data. Refund confirmation and wholesale-transfer approval now verify PINs with the deployed backend instead of `state.users[].pin`.

## Installation and deployment (in order)

1. Commit the current working branch before replacing source. Copy the updated project's contents into the SAME React/Vite project. Preserve `.git` and **your existing `.env.local`**. Do not copy `node_modules` or secrets from another computer.
2. In **Supabase SQL Editor**, run the entire **`supabase/migrations/202610170003_pin_recovery.sql`** file **once** (after the earlier account management and audit migrations). This creates private recovery-grant storage and its service-role-only redemption RPC, plus an Admin chooser RPC; it updates the public account chooser RPC to return the role to the UI. The role is NOT displayed on account cards. Re-running the migration won't re-execute any previous lost grants but can be done in development if required.
3. **Important: Configure the actual Supabase recovery email template.** Navigate **Supabase Dashboard → Authentication → Email Templates → Reset Password**. Preserve any other desired email markup and change the reset-link target to:

   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Reset HappyTech PIN</a>
   ```

   This step is **required**, not optional. The previous default `{{ .ConfirmationURL }}` sends a Supabase session callback rather than the one-time token hash needed for strict server-side verification. With the default email template, the new Reset PIN form will correctly reject the link. The template sends an identity-recovery token to your own allowed `redirectTo`, not a PIN. Ensure the dashboard accepts `{{ .RedirectTo }}` (Supabase's supported redirect template variable). **Do not attach email tracking or link-prefetch tools to the reset link.**
4. Under **Authentication → URL Configuration**, keep the Site URL `http://localhost:5173` and add **`http://localhost:5173/reset-pin`** under Redirect URLs for local development, plus your deployed HTTPS equivalent when applicable. The Reset PIN screen needs a direct page URL to work on reload. For production use a host that serves your Vite SPA on all paths (fallback to `index.html`).
5. With your previously linked Supabase project, run:

   ```powershell
   npx supabase functions deploy account-auth --no-verify-jwt
   ```

   The Edge Function intentionally allows anonymous requests *only* for PIN login and verified recovery actions; all other actions verify the authenticated bearer token and roles. Confirm `APP_ORIGIN=http://localhost:5173` is configured in function secrets. For your production domain update `APP_ORIGIN` to match the deployed frontend's exact origin; don't include trailing slashes.
6. Run:

   ```powershell
   npm install
   npm run build
   npm run dev
   ```

   Visit **`http://localhost:5173`** (not a different port).

## Test: Cashier Forgot PIN

1. Open the account selector, select an existing active **Cashier**, press **Forgot PIN?**. Check that the screen says **Admin Verification**, not email recovery.
2. Choose an active Admin; try a wrong PIN. The app must refuse to advance. Five failed attempts will temporarily lock that Admin's PIN (existing database behavior). Use a test Admin to avoid disrupting staff.
3. Enter the correct Admin PIN. New PIN and Confirm PIN fields should appear. Try a three-digit PIN and two different four-digit PINs; the UI must reject both.
4. Set matching new PINs. You should see **PIN reset successful**. Return to account selection and log in as that Cashier using the NEW PIN. Old PIN must fail.
5. Open Admin **Activity Logs**; look for **Cashier PIN recovered with Admin verification**. No PIN value may appear. Verify direct access to email recovery (`/reset-pin` without a link) says link invalid.

## Test: Admin Forgot PIN

1. Sign out, select an active Admin, press **Forgot PIN?** and enter their registered email. The email address is validated but the UI does not disclose whether a mailbox exists.
2. Click the recovery link from the **updated email template**. The browser should open `http://localhost:5173/reset-pin?...` and display **Verifying recovery link**, then **Reset your PIN**.
3. Try mismatched PINs and fewer than four digits; they must be rejected. Choose matching four-digit PINs, submit, then return to account selection.
4. Log in with the new PIN; the old PIN should not work. Check Activity Logs for **PIN recovered through verified email**. Reopening the same link should be rejected (Supabase OTP is single-use).
5. Directly opening `/reset-pin` without a valid email link, using an expired link, or changing `type=recovery` to another type must be rejected.

## Test: Super Admin Forgot PIN

Repeat the Admin procedure with the **Super Admin's registered email**. After recovery, confirm the Super Admin dashboard and Admin Management remain accessible. The corresponding Activity Logs must show the email PIN recovery event.

## Verification notes and limitations

- JSX/module and Edge Function TypeScript **syntax checks passed** in the provided archive build environment. I could not run a complete Vite build or contact **your** Supabase project; run `npm run build` and execute the above tests locally before releasing.
- Supabase sends recovery emails; your email provider may apply rate limits. Treat test recovery links as credentials, do not paste them into chat, screenshots, or source code.
- Recovery grants are in `public.pin_recovery_grants` with RLS enabled and **no direct grants** for the `anon`/`authenticated` roles. Only the service-role RPC can redeem them. The server stores SHA-256 of the random grant and the existing bcrypt-style hash of the PIN, never plaintext PINs.
- `supabase.auth.signOut({ scope:'local' })` clears the local session after email PIN recovery. Previously issued access tokens on **other devices** may remain valid until expiry; configure appropriate short access-token TTL and stricter session controls before production.
- Existing general business data remains a localStorage mock. Its old credential fields are now removed from new stored copies. Account authentication is online-only; a proper offline cash-register authorization strategy remains future work.
- **Security before production:** enable edge/network IP-based rate limits and audit abuse, test RLS/policy restrictions, limit who can access shared kiosks, and run real end-to-end integration tests. A four-digit PIN plus account lockout alone is not high assurance.
- You can periodically remove stale grants with a **separately authorized** backend task (`DELETE ... WHERE expires_at < now() - interval '7 days'`); do not expose that SQL as a public RPC.

## Changed files

- `src/pages/Login.jsx`: role-sensitive Forgot PIN views and mobile-safe inputs, email request callback, Cashier Admin-verification/reset success flow.
- `src/pages/ResetPin.jsx`: **new** dedicated verified email recovery form; token removed from browser URL after retrieval.
- `src/App.jsx`: dedicated `/reset-pin` route, proper return to account selection, legacy PIN stripping from browser-stored mock state; retains existing role routes and initial PIN-change screen.
- `src/lib/supabase.js`: `listRecoveryAdmins`, explicitly disable automatic callback-session detection (the email recovery token is verified by the Edge Function).
- `src/index.css`: responsive login and dedicated recovery styles.
- `src/pages/ActivityLogs.jsx`: display labels for the two new recovery audit events.
- `src/pages/POS.jsx` and `src/pages/SalesHistory.jsx`: replace old demo-PIN comparisons with secure, backend PIN checks for existing mock approvals/refunds.
- `src/data/mock.js`: remove demo plaintext PINs and legacy recovery PIN.
- `src/pages/Settings.jsx`: update recovery guidance.
- `AGENTS.md`: update stale frontend-only instructions to reflect existing Supabase-backed auth.
- `supabase/functions/account-auth/index.ts`: anonymous Admin-verified Cashier recovery and email OTP recovery, one-use grants, protected legacy POS approval checks.
- `supabase/migrations/202610170003_pin_recovery.sql`: **new** private grant table, atomic service-only reset RPC, Admin chooser, and updated role-bearing account chooser.
