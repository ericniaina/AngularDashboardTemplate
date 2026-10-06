# Angular Dashboard Template

A starter for Angular admin dashboards with SSO login through a BFF (backend-for-frontend), role-based access, and worked examples of the screens most dashboards need.

Angular 21 · Tailwind CSS 4 + spartan/ui · AG Grid Community · ng2-charts · Transloco (en/fr) · signals, zoneless · Vitest

## Quick start

Requires Node 24.13.0 or later (pinned in `.nvmrc`; with NVM for Windows: `nvm install 24.13.0` then `nvm use 24.13.0`). `.npmrc` sets `engine-strict`, so npm refuses any package that does not support the running Node.

```bash
npm install     # also installs the mock BFF in ./mock-bff
npm start       # mock BFF on :3000 + app on http://localhost:4200
```

Click **Sign in with SSO**. The mock identity provider lets you pick a user:

| User | Role | Sees |
|---|---|---|
| Alice Admin | Admin | everything, including Order lines and Users |
| Marc Manager | Manager | Dashboard, Countries, Employees, Onboarding |
| Vera Viewer | Viewer | Dashboard, Countries (read-only) |

## What's inside

| Page | Demonstrates |
|---|---|
| Login / 403 | Redirect-based SSO via the BFF, deep-link return, 403 page for role or API denials |
| Dashboard | KPI cards, line + donut charts, recent activity, mini grid, quick links |
| Countries | Simple CRUD: column filters, sorting, global search, advanced filter panel, dialogs |
| Employees | CRUD with a foreign-key column (department), locale-aware date picker with ISO values |
| Onboarding | Multistep form with per-step validation and a review step |
| Order lines | Editable grid: add / duplicate / remove rows, live totals, save all, unsaved-changes guard |
| Users | Admin-only page |

Across the app:

- **Session:** httpOnly cookie held by the BFF (no tokens in the browser). A 401 triggers a transparent refresh and retry, and a CSRF header is sent on every call.
- **Roles:** declared once in `core/auth/access-policy.ts`. They drive the routes, the menu and in-page checks, and the BFF enforces the same rules.
- **Language:** English/French switch. Grids, charts, numbers and dates all follow it, and the choice persists across sessions. i18n is confined to `core/i18n/` so it can be removed (see `CLAUDE.md`).
- **Dark mode:** toggle that defaults to the OS preference. Everything, including AG Grid and the charts, reads the same theme variables, so rebranding means editing one block of CSS variables in `src/styles.css`.

## Scripts

| Command | |
|---|---|
| `npm start` | BFF + dev server |
| `npm run start:app` / `npm run start:bff` | Run one side only |
| `npm test` / `npm run test:ci` | Unit tests (watch / single run) |
| `npm run build` | Production build to `dist/` |

Mock BFF settings (environment variables): `ACCESS_TTL_MS` (default 60 s, kept short so the refresh flow gets exercised), `REFRESH_TTL_MS`, `LATENCY_MS`, `PORT`.

## Using a real BFF

Implement the contract in `docs/PROJECT_SPEC.md` §13. Then point `proxy.conf.json` at it for development, or serve the app and BFF behind the same origin in production. The Angular code only ever calls relative `/bff/*` and `/api/*` URLs.

## Docs

- `docs/PROJECT_SPEC.md`: what the template does, feature by feature, plus the BFF contract.
- `CLAUDE.md`: the coding rules for this repo (conventions, UI components and look & feel, auth, grids, i18n, dates, testing).
