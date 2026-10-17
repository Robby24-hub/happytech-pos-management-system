# HappyTech POS & Management System — integrated UI + Supabase auth

React 19, Vite 7, Tailwind v4 and React Router 7. The business pages use the redesigned modular UI from the design branch; login, account hierarchy, management, security logs and PIN recovery use Supabase from the authentication branch.

## Running locally

Requirements: Node 20.19+ or Node 22.12+, and access to the existing configured Supabase project.

```bash
npm install
npm run build
npm run dev
```

The Vite dev server uses **http://localhost:5173** with `strictPort: true` to match the previously configured Edge Function's `APP_ORIGIN`. Stop other Vite dev servers if the port is occupied.

Create `.env.local` based on `.env.example` with the **project URL** and **publishable (or legacy anon) key**. Never add a service-role/secret key to the frontend. `.env.local` is ignored by Git.

**If the Supabase migrations and Edge Function were deployed for the authentication branch, do NOT run them again merely because of this UI merge.** This merge introduces no new SQL migration and leaves the existing `account-auth` Edge Function unchanged. Follow `SETUP_AUTH.md` and `PIN_RECOVERY_SETUP.md` only for a fresh installation.

## Role pages

- Cashier: POS and Sales History; POS is their homepage.
- Admin: Dashboard, Sales History, Inventory, Reports, Settings (including cloud-managed Cashier accounts), Activity Logs.
- Super Admin: Home, Admin Management, Activity Logs.

Authentication/session restoration, first-use PIN change, cashiers' Admin-assisted reset, Admin/Super Admin email recovery and account actions use Supabase. The account chooser does **not** use the role selector and PINs from the old UI branch.

## Current limitations

**Business data remains mock browser-local data.** This includes products, local stock, checkout transactions, local sales history, reports, payments, and backups. Protect authentication credentials through Supabase, not in mock browser accounts. There is **no** backend inventory/sales sync or production-grade offline queue yet. PIN authorization for the current POS stock-transfer approval and sales refund/delete prompts calls the server, but the subsequent business-data mutation is still local and isn't a cloud transaction. Do not use the system for real sales before implementing and testing those business APIs.

## Merge notes

See `MERGE_REPORT.md` for conflict resolution, architecture decisions, changed paths and a local test checklist.
