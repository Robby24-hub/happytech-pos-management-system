# HappyTech POS & Management System

React + Vite + Tailwind CSS frontend based on the Happy Tech POS Figma prototype, with local mock data and no backend.

## Run this project

Use Node.js 20.19+ or 22.12+ (Node 22 LTS recommended).

```bash
npm install
npm run dev
```

To build and preview the production bundle:

```bash
npm run build
npm run preview
```

## Add to your existing fresh Vite project

Your existing Vite project was not included in the shared workspace, so this download is a complete runnable project. Either open this folder directly in VS Code, or copy `src`, `public`, `index.html`, `vite.config.js`, and `package.json` into your fresh React Vite project, replacing the starter files. Then run `npm install` and `npm run dev` from that project folder. Keep your own Git repository and do not copy a `node_modules` folder. If you already have code you want to keep, merge the dependencies and source files instead of replacing them.

Tailwind v4 is configured through `@tailwindcss/vite` and `@import "tailwindcss"`. No Tailwind v3 configuration commands are needed.

## Demo sign in

All seeded accounts use PIN **1234**. The default Admin recovery PIN is **4321**.

| Role        | Account                      | Interface access                                                           |
| ----------- | ---------------------------- | -------------------------------------------------------------------------- |
| Admin       | Ricky Yurag                  | Dashboard, POS, Sales History, Inventory, Reports, Settings, Activity Logs |
| Cashier     | Maria Santos / Rogelio Reyes | POS and Sales History, including refunds with own PIN                      |
| Super Admin | System Administrator         | All management pages, account administration, local demo backup/restore    |

The current project notes introduce Super Admin, notifications, and logs beyond the supplied Figma screens. These use the same design style. Role access and PIN checking are client-side demonstrations only; they are not secure authentication.

## Included workflows

- Role selection, account selection, PIN keypad, recovery PIN, logout.
- Dashboard with illustrative performance figures, target gauge, period selection, and working quick actions.
- POS product search, kilogram/sack filtering, fractional kilogram quantities, cart editing, clear cart confirmation, stock checks, and owner-approved wholesale transfers.
- Cash checkout, Exact Amount, change calculation, static GCash QR upload and manual verification.
- Sale receipt, browser printing, downloadable PDF receipts, and a New Sale action.
- Sales History search, payment/date/custom range filters, invoice drawer, full-order refunds, print summary, and PDF export.
- Inventory search, native dropdown filters, sorting, add/edit/delete products, add groups, restock, product details, and POS availability switches.
- Reports calculated from mock sales, date ranges, payment breakdown, product performance, PDF export, and browser printing.
- Settings for store information, cashier accounts, payments, receipt footer, thresholds/targets, account/PIN, and recovery options.
- Super Admin account management, activation/deactivation, activity logs, stock notifications, and downloadable/restorable local JSON backups.
- Responsive layouts for desktop, landscape tablet, portrait tablet, and narrow phones. On phones the POS cart stacks below the product grid.

## Data and limitations

- All data lives in browser `localStorage` under `happytech-demo-v1`. Sales update mock inventory; refunds restore stock. Browser refresh retains records, but sign-in is required again.
- Seed sales use the current local date so Today filters work. Dashboard performance starts with illustrative Figma baseline values; the Reports page derives actual figures from demo records.
- New sales are labeled `Demo local`. Nothing is uploaded, synchronized, or confirmed by a server. No service worker, installable PWA, IndexedDB queue, or real offline authentication is implemented in this frontend-only deliverable.
- GCash is a static image and a manual confirmation checkbox. No payment API is connected.
- Printing opens the browser's print dialog. Bluetooth printer integration is not implemented or verified.
- Backup/restore exports the browser's mock data. There is no database or automatic six-hour backup scheduler.
- Clearing browser storage removes the demo data. To reset, run `localStorage.removeItem('happytech-demo-v1')` in the browser console and reload.
- This is a frontend implementation, not a production financial system. Server authentication, permissions, transaction validation, inventory concurrency, synchronization, and durable backups remain backend work.

## File map

- `src/App.jsx`: application state, role navigation, local persistence, notifications.
- `src/pages/`: Login, Dashboard, POS, Inventory, SalesHistory, Reports, Settings, Administration.
- `src/components/`: shared UI, chart, receipt/PDF helpers.
- `src/data/mock.js`: demo accounts, products, transactions, settings, formatting helpers.
- `src/data/assets.json` and `public/assets/`: local assets exported from the Figma prototype. No temporary asset URLs are used at runtime.
- `src/index.css`: Tailwind theme, reusable component styles through `@apply`, responsive rules, and print styles.

Figma reference: https://www.figma.com/design/eE3MeDFJprUXFMNqgtipbW/Happy-Tech-POS-Prototype?node-id=0-1

## Verification completed

Production build passed. Automated Chromium checks passed for cash checkout, GCash manual confirmation, receipt PDF generation, full refunds and stock restoration, product creation, wholesale transfer, persistence after refresh, cashier navigation restrictions, Settings edits, and Super Admin JSON backup export. No runtime errors or failed asset requests were observed in the checked flows. Desktop/tablet/phone layouts were rendered and inspected. Database/PWA/printing hardware behavior was outside this frontend-only verification.
