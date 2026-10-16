# Project rules

- Official system name: HappyTech POS & Management System.
- Preserve the existing React/Vite frontend. Business transactions and inventory still use mock data, while the authentication and account-management foundation uses Supabase.
- Use JavaScript and standard CSS. Inspect package.json before changing the project and preserve the existing Vite + React setup.
- Supabase Auth, PostgreSQL RPCs, and the account-auth Edge Function are already integrated for login, account management, Activity Logs and secure PIN recovery. Do not replace them with mock authentication. Sales/inventory and payment integrations are future stages.
- Follow the reference design closely. Do not replace it with a generic dashboard.
- Before implementing screens, inspect the project and design-reference/ files and use the Figma integration when available to inspect actual screens and assets. Never claim Figma was inspected unless access succeeded.
- If Figma is inaccessible, report that and use the HTML/CSS references. Ask for screenshots only when necessary to resolve important design details.
- Identify the shared layout, typography, colors, spacing, components, and page-specific elements from accessible references before implementation. Do not invent design findings when references are unavailable.
- Use reusable React components and scoped CSS class names to prevent page styles from affecting other pages.
- Keep business calculations and mock-data access separate from UI components.
- Use Philippine peso formatting and consistent date/time formatting. Centralize formatting with Intl, using en-PH, currency PHP, and Asia/Manila for displayed date/time values.
- Provide working interactions, clear validation, and appropriate empty states.
- Use actual dropdown menus for filters, not modal-based option pickers.
- Explain changes simply because the user is learning React.
- Complete only the requested stage, then summarize changed files and validation.

# Current stage

Current implementation stage: working cloud account management with role-specific PIN recovery. Preserve existing features. Only modify scope explicitly requested by the user, and require RLS / Edge Function server-side authorization for sensitive actions.

# Proposed implementation structure

The React project lives in HappyTech-POS-Management-System/.

- src/main.jsx: existing React entry point.
- src/App.jsx: application composition and page selection.
- src/components/layout/: shared layout confirmed from design references.
- src/components/ui/: reusable controls, dropdown filters, validation messages, and empty states.
- src/pages/: page-specific React components and scoped CSS, with page names determined from the actual references.
- src/styles/: shared design tokens and minimal global styles derived from the references.
- src/data/: mock records and functions for reading or updating mock data.
- src/utils/: business calculations, input validation, and shared currency/date/time formatters.
- src/assets/: verified design assets.

These directories are proposals for later implementation, not requirements to create empty folders now. Preserve existing scripts, configuration, and dependencies unless a later authorized stage requires changes.