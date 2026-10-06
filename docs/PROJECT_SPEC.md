# AngularDashboardTemplate — Build Spec

This is the feature-by-feature prompt for the project. Conventions/how-to-build are in `CLAUDE.md` at the repo root — read both before implementing anything.

**Status (2026-09-25): v2 implemented** on Angular 22.2, Tailwind CSS 4.3, spartan/ui 1.5 (brain + helm), AG Grid 36.2, ng2-charts 10, Transloco 8.4, Express 5 (mock BFF); verified with the unit suite and a headless-Edge walkthrough (every page, both languages, both themes, mobile, Admin and Viewer). Where implementation refined the plan, this document and `CLAUDE.md` were updated to match the code.

**History:** v1 was built on Angular 22.2, Material 22.2, AG Grid 36.2, ng2-charts 10, Transloco 8.4 and Express 5 (mock BFF). Its behavior (auth, roles, grids, i18n, dates, mock BFF) was validated and carries over unchanged. v2 replaces the UI layer: Angular Material is out; Tailwind CSS v4 + spartan/ui + Angular CDK are in, with explicit look-and-feel rules (`CLAUDE.md` → "UI components", "Look & feel").

**What changed from v1, and why:** the Material build's forms and navigation looked wrong: the active nav highlight was rounded on one side and square where it met the sidebar edge, dialog fields touched each other with no gutter, a switch sat next to a text field at a different height, and dialogs, buttons and inputs used three unrelated corner radii. v2 fixes this with a shadcn-style component set whose code we own (spartan helm), one token-based theme, and written layout rules. Affected sections: 2 (topbar), 3 (menu), 4 (dashboard), 5–8 (dialogs, selects, stepper, toasts), 9 (dark mode), 11 (dates).

Decisions locked in:

| Area | Choice |
|---|---|
| UI library | Tailwind CSS v4 + spartan/ui (brain + helm) + Angular CDK; Lucide icons |
| Data grid | AG Grid Community |
| State management | Native signals + injectable services |
| Project structure | Angular CLI, single app, standalone components |
| Auth backend | Mock BFF (local Express server), swappable for a real one later |
| Test runner | Vitest |
| Charts | ng2-charts (Chart.js) |
| Dark mode | Token CSS variables (`:root` / `.dark`), manual toggle in topbar |
| i18n | Transloco, `en` + `fr`, built to be removable (see `CLAUDE.md`) |

---

## 1. Roles (example data)

Three example roles, enough to demonstrate role-based menus/guards without being a real permission system:

- **Admin** — sees everything, including the interactive/editable grid demo and a "Users" admin area.
- **Manager** — sees dashboard, both CRUD examples, multistep form.
- **Viewer** — sees dashboard and the referential CRUD list in read-only mode (no create/edit/delete buttons, grid actions hidden).

Roles come back from `/bff/user` as `roles: string[]`. The role lists live once in `ACCESS` (`core/auth/access-policy.ts`); routes (`data.roles`), menu items and in-page checks reference it. Absence of `roles` means "any authenticated user." The mock BFF enforces the same rules server-side (returns 403), so client checks are UX, not security.

Demo users on the mock IdP page: **Alice Admin**, **Marc Manager**, **Vera Viewer**.

## 2. Auth flow (SSO via BFF)

**Login page (`/login`)**
- No username/password fields. One button: "Sign in with SSO".
- Click → full navigation to `/bff/login?returnUrl=…` (a redirect-based flow, not an XHR).
- Mock BFF shows a stand-in IdP page (pick a demo user), then `POST /bff/login/callback` sets the httpOnly session cookie and redirects to the originally-requested deep link. `returnUrl` is validated on both sides (must be a same-origin path) to prevent open redirects.
- Language switcher and dark-mode toggle are also available on the login page.
- Layout: a single centered card (`max-w-sm`) on `bg-muted`, with the 80×80 logo and app name, a one-line description and a full-width primary button. Language and theme controls sit in the top-right corner of the page.

**Session bootstrap**
- On app init (`app.config.ts` provider / `APP_INITIALIZER`-equivalent using `provideAppInitializer`), call `GET /bff/user`.
  - 200 → populate `AuthService` user/roles signals, app renders normally.
  - 401 → user is anonymous; unauthenticated routes still work, protected routes redirect to `/login?returnUrl=...`.

**Token refresh**
- Entirely handled behind the `authInterceptor` described in `CLAUDE.md`: a `401` on any BFF call triggers one `POST /bff/refresh` attempt, then the original request is retried; a second failure sends the user to `/login?returnUrl=…`. Concurrent 401s share a single refresh call.
- No client-side timers/expiry guessing — refresh is reactive (on 401), not proactive polling, to keep this a realistic BFF pattern.
- The mock BFF's access lifetime defaults to 60 s so this path is exercised during a normal demo (`ACCESS_TTL_MS` to change it).

**CSRF**
- Cookie sessions need CSRF protection: the interceptor sends `X-CSRF: 1` on every BFF/API call and the BFF rejects state-changing requests without it (403). Browsers can't attach custom headers to cross-site form posts, so this blocks the classic CSRF vector.

**403 page (`/forbidden`)**
- Shown when a route guard blocks access due to missing role, or a BFF call returns 403.
- Simple page: explains access is denied, shows which role would be required if known, a button back to `/dashboard`.
- Receives context as query params (`/forbidden?required=Admin&from=%2Forder-lines`), bound to component inputs. Rendered inside the shell, so the user keeps their menu.

**Logout**
- Button in the topbar user menu → `POST /bff/logout` → clear local auth signal state → navigate to `/login`.

**Connected user display**
- Topbar shows avatar/initials (`hlm-avatar`) + display name; clicking opens a dropdown menu (`hlm-dropdown-menu`) with name, email, roles listed as badges, a separator and a "Sign out" action. Backed by `AuthService.user()` signal, not re-fetched per component.

**Topbar controls (full set, left to right after the sidebar toggle)**
- Language switcher (`en` / `fr`), lives in `core/i18n/` (`<app-language-switcher>`): a ghost button showing the current code that opens a dropdown menu. Persisted in `localStorage`.
- Dark-mode toggle (sun/moon ghost icon button), backed by `ThemeService.isDark` signal.
- Connected-user menu described above.
- Topbar: `--app-header-height` (6rem) from `md` up so it lines up with the sidebar's logo row, `h-14` with a small logo on mobile; `border-b`, same background as the page, controls right-aligned with `gap-2`. The page title lives in the page header, not the topbar.

## 3. Menu (role-based)

- `MenuService` exposes a `computed()` signal: full static menu tree filtered down to items whose `roles` (if any) intersect the current user's roles.
- The sidebar (spartan Sidebar) renders from that computed signal — no component re-implements the filtering.
- Sidebar look: header with the 80×80 logo + app name (clamped to two lines), the same height as the topbar (`--app-header-height`, see `CLAUDE.md` → Brand); one group per menu section, each with a small muted group label; items = Lucide icon + label, `rounded-md`, inset from the sidebar edges, active item = `bg-sidebar-accent` + `font-medium` (see `CLAUDE.md` → "Look & feel"). On desktop, it collapses to an icon rail (labels become tooltips; `Ctrl/Cmd+B` toggles it) and spartan persists the choice in a `sidebar_state` cookie (a UI preference, not session state). Below `md`, it is an off-canvas sheet opened from the topbar toggle, closing on navigation.
- Route guards (`roleGuard`) enforce the same rule at the router level, so a filtered-out menu item is never reachable by typing the URL either — it lands on `/forbidden`.

## 4. Dashboard (`/dashboard`, first page after login)

Classic widget layout, CSS grid, responsive (stacks to single column on narrow widths). Chart widgets use ng2-charts (Chart.js) exclusively. Suggested widgets:

1. **KPI stat cards row** (4 cards, `hlm-card`): "Referential items", "Open order lines", "Active users", "Pending approvals" — label + small muted icon on the top row, big number (locale-formatted), trend delta (up/down icon, colored, then muted "vs previous period").
2. **Line chart** (ng2-charts): sign-ins and changes over the last 30 days; axis dates localized.
3. **Donut chart** (ng2-charts): countries by region, region names translated.
4. **Recent activity list**: last actions with icon and localized timestamp.
5. **Quick-access table**: small `<app-data-table>` of the 5 most recent countries with a "View all" link.
6. **Quick links card**: one button per feature the user can access (derived from the role-filtered menu), plus "Try a forbidden API call (403)" which calls `/api/restricted-demo`.

All widget data comes from one call, `GET /api/dashboard/summary` (via `httpResource`), so the dashboard isn't hardcoded. While it loads, each widget shows a skeleton of its own shape. Chart colors come from the `--chart-1..5` theme tokens and are re-read when the theme changes.

## 5. Referential CRUD example

Suggested entity: **Countries** (or similar simple flat reference data — code, name, active flag).

- Route: `/referential`.
- `<app-data-table>` (AG Grid) listing all records:
  - Per-column floating filter, sortable columns.
  - A global search bar above the grid that filters across all columns at once (AG Grid quick filter) — including translated values (typing "asie" finds Asian countries in French).
  - An "Advanced filter" panel (outline toggle button with an active-filter count badge; the panel is a collapsible card between the toolbar and the grid, with its fields in a responsive grid): name contains, region multi-select (`hlm-select` multiple), active/inactive/all (radio group). Implemented with AG Grid's Community *external filter*, combined with the column filters and quick filter. "Reset" clears it.
- Create / Edit via an `hlm-dialog` with a reactive form (validators: required, 2–3 letter code, max length, unique code checked against the loaded dataset). The BFF also rejects duplicates (409 → error shown on the code field). Save/delete outcomes are confirmed with a toast.
- Dialog layout (reference for every CRUD dialog): title "New country" / "Edit country" + description; row 1 = Code (narrow) and Name in a `sm:grid-cols-2` grid; row 2 = Region, full width; row 3 = "Active" switch as a horizontal field with a description ("Inactive countries are hidden from pickers"); footer = Cancel (outline) + Save.
- Delete with a confirm dialog (`shared/components/confirm-dialog`).
- Double-click a row to edit (or view, for Viewers).
- Viewer role: grid renders, action column and "New country" hidden, "Read-only access" badge shown in the page header; double-click opens the dialog read-only (controls disabled, only a "Close" button).

## 6. CRUD with a foreign-key column

Suggested entity: **Employees**, referencing **Department** (from a small lookup list, could reuse or extend the referential CRUD's data).

- Route: `/employees`.
- Grid shows a `department` column displaying the department's *name*, not its id — resolved into the row model (`departmentName`) from the department lookup, not a per-row HTTP call, so sorting and filtering work on the name.
- The department lookup is `shared/lookups/departments.service.ts` (`httpResource`, loaded once, shared with the onboarding wizard).
- Create/Edit form: department picked via `hlm-select` sourced from the lookup; hire date via `<app-date-field>`. Layout: first + last name paired, then email, then department + hire date paired.
- Demonstrates: loading a lookup once (shared signal/service), resolving ids → display values in a grid, and validating a required foreign key in the form.
- Also carries a **Hire Date** field — this is the concrete demo for locale-aware date formatting, see section 11.

## 7. Multistep form example

Suggested flow: **"New Employee Onboarding"** wizard (ties naturally into the Employees example, but can be standalone data).

- Route: `/onboarding`.
- `<app-stepper>` (`shared/components/stepper`, extends Angular CDK's `CdkStepper`, rendered with Tailwind; spartan has no stepper), linear mode, each step its own reactive `FormGroup` merged into one parent form.
- Look: the wizard is one card. The header shows numbered step indicators joined by a line (completed = primary check, current = primary ring, upcoming = muted) with step titles; the body holds the current step's form grid; the footer holds Back (outline, left) and Next / Submit (primary, right).
- Steps: e.g. (1) Personal info, (2) Role & department (reuses the foreign-key lookup), (3) Access/permissions (checkboxes for roles), (4) Review & submit — read-only summary of steps 1–3 before final submit.
- Per-step validation blocks "Next" until valid (and reveals the errors); a step already completed can be revisited and re-validated. Step 3 uses a custom `atLeastOneChecked` group validator.
- Step 3's role checkboxes are an `hlmFieldSet` with a legend; each checkbox is a horizontal field with a one-line description of the role.
- Steps 1 and 2 include date fields (`<app-date-field>`: birth date, start date) — same locale/ISO rules as section 11; the review step shows the dates localized and states the ISO values that will be sent.
- Stepper switches to vertical orientation on narrow screens (`BreakpointObserver` → signal).
- Submit posts to `POST /api/onboarding` and shows a success state (a distinct "done" panel with "Start another" / "Back to dashboard").

## 8. Interactive datagrid example

Suggested entity: **Order Lines** (or invoice lines) — a grid that's fully client-editable before a single "Save" commits it.

- Route: `/order-lines`.
- AG Grid with inline cell editing: product (select editor; picking a product pre-fills its list price), quantity and unit price (number editors). Amounts are formatted as locale currency.
- Toolbar actions: **Add line** (blank row at the bottom, product cell opened for editing), **Duplicate (n)** (clones each selected row with a new client-side id, inserted right below its source), **Remove (n)**. Checkbox multi-selection. Actions are disabled while the initial load is in flight (otherwise the load response would wipe lines added meanwhile).
- Row mutation state lives in `OrderLinesStore` — the grid runs with `readOnlyEdit`, so it is a view over the store's signal, never the source of truth.
- Pinned totals row (total quantity, total amount) recalculates via `computed()`.
- Invalid cells (missing product, quantity < 1, negative price) are outlined in the error color; the banner counts lines needing attention and **Save** stays disabled until they're fixed.
- "Save" sends the full set with `PUT /api/order-lines`; until then everything is client-side. Dirty state = current lines differ from the last saved snapshot (editing a value back to its original makes it clean again). Unsaved changes trigger a confirm dialog when navigating away (`canDeactivate`) and the browser's leave-page prompt on reload/close. "Discard changes" restores the last saved state.

## 9. Dark mode

- `ThemeService` (`core/layout/theme.service.ts`) exposes an `isDark` signal.
- First load: read `window.matchMedia('(prefers-color-scheme: dark)')` if no stored preference exists yet.
- After that: user's manual choice wins, persisted in `localStorage` (a UI preference, not session state, so this doesn't conflict with the no-token-in-storage rule).
- Applies via a single `dark` class on `<html>` (plus `color-scheme`); all color values come from the theme's CSS variables (`:root` / `.dark` in `styles.css`, generated by spartan's theme CLI) — no component branches on light/dark in TypeScript.
- AG Grid's theme is built from the same variables, so grids follow automatically. Canvas charts read the variables and re-read them on toggle (see `CLAUDE.md` → Theming).
- Toggle is a topbar icon button (sun/moon), see section 2's topbar controls list.

## 10. i18n

- **Transloco**, not `@angular/localize` — chosen specifically so it stays a self-contained, removable piece (see `CLAUDE.md` → "i18n — built to be removable" for the full rationale and the file layout).
- Two languages ship: `en` (default) and `fr`, switched from the topbar language control.
- Translation JSON: root strings in `public/i18n/<lang>.json`; per-feature scopes (`dashboard`, `countries`, `employees`, `onboarding`, `orders`, `admin`) in `public/i18n/<scope>/<lang>.json`, preloaded with that feature's route.
- Every user-facing string (menu labels, page titles, form labels/validation messages, dialog text, grid column headers, toolbar button labels, the 403 page, the login button, toasts, chart labels, icon-button `aria-label`s and tooltips, date-picker ARIA labels) is translated — via the `transloco` pipe in templates or `translateGroup()` in TypeScript.
- AG Grid's own UI (filter menus, pagination, "no rows") is localized with `@ag-grid-community/locale`; the grid is re-created when the language changes because its `localeText` is read only at creation.
- How to remove i18n entirely: see `CLAUDE.md` → "i18n — built to be removable".

## 11. Locale-aware date formatting (display only, value stays ISO)

Concrete demo: the Employees form/grid's **Hire Date** field (section 6). Two things change with locale, one thing never does:

**Changes with locale:**
- The `<app-date-field>` (spartan Date Picker: a text input plus a calendar button that opens the calendar): month names, day-of-week labels, first day of week (Monday in `fr`, Sunday in `en`), and the input's displayed format (`4/9/2026` in `en`, `09/04/2026` in `fr`).
- Typing a date: `09/04/2026` is read as 9 April in `fr` and September 4 in `en` (`parseLocalizedDate`, plugged into the picker's `parseDate` config); ISO input (`2026-04-09`) is accepted in both; an impossible date shows an "Invalid date" error instead of being rolled over.
- Any other rendered date in the app (grid columns, dashboard timestamps, chart axes, the wizard's review step): formatted via the shared `formatLocalizedDate()` util / `localizedDate` pipe (see `CLAUDE.md` → "Dates"), which takes its locale from `LocaleService` — switching language re-renders every visible date immediately, no reload. Example: hire date `2021-03-15` shows as `Mar 15, 2021` / `15 mars 2021`.

**Never changes:**
- Every date in the app's models, forms and on the wire is a fixed ISO `yyyy-MM-dd` string, regardless of active locale. `<app-date-field>` is a form control whose value *is* that string (`FormControl<string | null>`); the `Date` the picker needs exists only inside the component, converted via the locale-independent `iso-date.util.ts`. The locale-aware formatter never produces a value sent to the backend — and the mock BFF rejects non-ISO dates with 400.
- The employee dialog shows the stored value as the field's description ("Stored value: 2021-03-15") to make this contract visible in the demo.

**First day of week:** derived from `Intl.Locale` week info, with a fallback table (`core/locale/week-info.ts`) for browsers without that API.

## 12. Guards & route table (reference)

| Route | Guard | Roles |
|---|---|---|
| `/login` | `guestGuard` (signed-in users go to `/dashboard`) | — |
| `/dashboard` | `authGuard` | any |
| `/referential` | `authGuard`, `roleGuard` | Admin, Manager, Viewer (Viewer read-only) |
| `/employees` | `authGuard`, `roleGuard` | Admin, Manager |
| `/onboarding` | `authGuard`, `roleGuard` | Admin, Manager |
| `/order-lines` | `authGuard`, `roleGuard`, `unsavedChangesGuard` (deactivate) | Admin |
| `/admin/users` | `authGuard`, `roleGuard` | Admin |
| `/forbidden` | `authGuard` (inside the shell) | any |

`authGuard` sits on the shell route, so every child is protected. Unknown URLs redirect to `/`.

## 13. Mock BFF contract (`/mock-bff`, Express, dev-only)

Runs on its own port; Angular CLI dev server proxies `/bff/*` and `/api/*` to it (`proxy.conf.json`) so cookies stay same-origin in dev.

| Endpoint | Method | Behavior |
|---|---|---|
| `/bff/login` | GET | Mock IdP page: pick a demo user (`returnUrl` sanitized to a same-origin path) |
| `/bff/login/callback` | POST | Starts the session (httpOnly `bff_session` cookie, `SameSite=Lax`), 302 to `returnUrl` |
| `/bff/user` | GET | 200 + `{ id, name, email, roles[] }` if session valid, else 401 |
| `/bff/refresh` | POST | Rotates the session id if the refresh window is valid (204), else clears the cookie (401) |
| `/bff/logout` | POST | Ends the session, clears the cookie (204) |
| `/api/dashboard/summary` | GET | KPIs, 30-day activity, region breakdown, recent activity, recent countries |
| `/api/countries` | GET (any) / POST, PUT `/:id`, DELETE `/:id` (Admin, Manager) | Referential CRUD; 409 on duplicate code |
| `/api/departments` | GET | Lookup list for the foreign-key example |
| `/api/employees` | GET/POST/PUT/DELETE (Admin, Manager) | Foreign-key CRUD; `hireDate` must be ISO `yyyy-MM-dd` (400 otherwise) |
| `/api/onboarding` | POST (Admin, Manager) | Wizard submit; dates must be ISO |
| `/api/products` | GET (Admin) | Product lookup for the order-lines grid |
| `/api/order-lines` | GET / PUT (Admin) | Load / replace the full set of lines |
| `/api/admin/users` | GET (Admin) | Demo users list |
| `/api/restricted-demo` | GET | Always 403 (`requiredRoles: ['SuperAdmin']`) — exercises the 403 flow independently of route guards |

All `/api/*` routes require a valid session (401 otherwise, which the client answers with a refresh). Role violations return 403 with `{ requiredRoles }`. Non-GET requests without `X-CSRF: 1` return 403.

Env vars: `PORT` (3000), `ACCESS_TTL_MS` (60000), `REFRESH_TTL_MS` (1800000), `LATENCY_MS` (250, simulated network delay).

Session state, refresh validity, and all entity data are in-memory only (reset on server restart) — this is a demo backend, not a persistence layer. To use a real BFF: point `proxy.conf.json` (dev) or your reverse proxy (prod) at it and implement the same contract.

---

## Open items / possible next steps

- Whether the dashboard widget layout should be user-rearrangeable (CDK drag-drop) — nice-to-have, not in scope for v1.
- End-to-end tests: v1 was verified with a throwaway headless-Edge walkthrough (login per role, EN/FR, dark mode, every example page, guards); committing a Playwright suite would lock that in, and it could also capture the look-and-feel check (screenshots in light/dark, en/fr, desktop/mobile).
- Linting: no ESLint config yet (`ng add angular-eslint`); `prettier-plugin-tailwindcss` would keep class order consistent.
- Brand: themed from the logo colors `#479595` / `#2e6a56` (`CLAUDE.md` → Brand). `public/logo.svg` is a placeholder until the real logo file is dropped in. Rebranding = editing the theme variables in `styles.css` and replacing the logo; nothing else.
- AG Grid's date *filter* input is the browser's native date field, so its display follows the browser's language, not the app's.
