# AngularDashboardTemplate — Project Rules

This file governs how code is written in this repo. Read `docs/PROJECT_SPEC.md` for what to build; this file governs how.

## Stack

- **Runtime: Node 24.13.0** (`.nvmrc`; `engines.node` is `>=24.13.0`). Every package must support it: `.npmrc` sets `engine-strict=true`, so `npm install` refuses any package whose `engines.node` excludes the running Node. Before upgrading a package, check `npm view <pkg>@<version> engines.node`, then install on Node 24.13 and keep the regenerated `package-lock.json`.
- Angular: the latest version that supports Node 24.13 — currently **Angular 21** (Angular 22 requires Node `^24.15.0`). Its toolchain pins the rest: TypeScript `~5.9` (Angular 21 needs `<6.0`), Vitest `4.x`, jsdom `29.x` (jsdom 30 needs Node 24.15). Don't `ng update` to a major whose `engines` exclude 24.13.
- Standalone components/directives/pipes only. No NgModules for anything we author (a third-party lib that still ships an NgModule is fine to import).
- TypeScript strict mode (`strict: true` in tsconfig, keep it on).
- UI: **Tailwind CSS v4** + **spartan/ui** (shadcn-style components for Angular) on top of the **Angular CDK**. No Angular Material. See "UI components" and "Look & feel" below.
  - spartan/ui has two layers: *brain* (`@spartan-ng/brain`, npm dependency, headless/accessible behavior — never edited) and *helm* (Tailwind-styled components copied into the repo by the spartan CLI — our code, edited freely to set house style).
  - Icons: Lucide via `@ng-icons/lucide` (what the spartan CLI sets up): `<ng-icon name="lucideX" />`, registered per component with `provideIcons({ lucideX })` so only used icons are bundled. One icon set only — no Material Icons font.
- Stylesheets are plain CSS (`--style css`), not SCSS: Tailwind v4 is not designed to run behind Sass.
- Data tables: our own `<app-data-table>` built on the **Angular CDK table** (`@angular/cdk/table`) with spartan's table styling — no grid library. See "Data table rules".
- **No package that has a paid, premium or "pro" tier** (AG Grid, Kendo, Syncfusion, DevExtreme, Handsontable, …), even its free/community edition: the corporate npm proxy blocks them. Check before adding any dependency.
- State: signals + plain injectable services. No NgRx, no Akita, no other state library.
- Charts: ng2-charts (Chart.js wrapper) — the only chart library in the project, don't mix in a second one.
- i18n: Transloco (see dedicated section below) — not `@angular/localize`.
- Testing: Vitest, colocated `*.spec.ts`.
- Mock backend: local Express server in `/mock-bff` simulating the SSO/session/CRUD contract described in the spec.

## Commands

- `npm install` — installs the app and (via `postinstall`) `mock-bff/`.
- `npm start` — mock BFF on :3000 + `ng serve` on :4200 (proxy in `proxy.conf.json`). Sign in via the mock IdP page as Admin / Manager / Viewer.
- `npm run test:ci` — Vitest, single run. `npm test` watches.
- `npm run build` — production build; the initial-bundle budget is 800 kB warn / 1.2 MB error.
- Mock BFF knobs (env vars): `ACCESS_TTL_MS` (default 60000 — short on purpose so refresh gets exercised), `REFRESH_TTL_MS`, `LATENCY_MS`, `PORT`.
- `npm audit` must stay at 0 vulnerabilities. Dev-only generators that drag in vulnerable trees are installed only while used, never kept in `package.json`.
- spartan's generator (`@spartan-ng/cli`) is **not** a dependency: it pulls in Nx, ts-morph, axios… (15 high-severity advisories, 5 with no fix published). When you need it, install it temporarily, run it, then remove it:
  `npm i -D @spartan-ng/cli` → `ng g @spartan-ng/cli:ui <component>` (adds a helm component to `src/app/shared/ui/`, path set in `components.json`) or `ng g @spartan-ng/cli:healthcheck` (after upgrading `@spartan-ng/brain`; review its changes against the house edits listed under "UI components") → `npm uninstall @spartan-ng/cli`. Commit only the generated files, not the `package.json` / lockfile change.

## Angular conventions

- `inject()` function over constructor injection.
- `ChangeDetectionStrategy.OnPush` on every component.
- New control-flow syntax (`@if` / `@for` / `@switch`), never `*ngIf` / `*ngFor` / `*ngSwitch`.
- Signals for local and shared state; `computed()` for anything derived; `effect()` only for genuine side effects (e.g. syncing to `localStorage`, logging) — never to manually copy one signal's value into another when `computed()` would do.
- Every feature area is lazy-loaded (`loadChildren` / `loadComponent` in the route config). Nothing feature-specific goes in the eagerly-loaded bundle.
- Reactive forms only, for anything beyond a single trivial field.
- Functional guards and interceptors (`CanActivateFn`, `HttpInterceptorFn`) — no class-based guards/interceptors.
- Prefer `input()` / `output()` signal-based APIs over `@Input()` / `@Output()` decorators.
- The app is zoneless (Angular's default): UI updates are driven by signals, so state that the template reads must be a signal.
- Route params / query params reach components through `withComponentInputBinding()` as `input()`s — no `ActivatedRoute` subscriptions.

## Data fetching

- Read-only data (dashboard, lookups, admin lists): `httpResource()` — always guard with `hasValue()` before `value()`, because `value()` throws while the resource is in an error state.
- Data the user mutates (CRUD, editable grid): a feature-scoped store (`@Injectable()` provided in the page component's `providers`) holding private writable signals, exposing read-only signals, calling `HttpClient` and updating its signals with new arrays/objects — never mutating in place.
- Stores/components ignore 401/403 in their own error handlers; the interceptor already dealt with them.

## Folder structure

```
src/app/
  core/
    auth/            # AuthService, guards, interceptor, user/role models, ACCESS policy (access-policy.ts)
    i18n/            # Transloco wiring; index.ts is the only import path the app uses
    layout/          # shell (topbar + sidebar), menu service, theme service + toggle
    locale/          # LocaleService (display locale), calendar-locale (spartan calendar i18n sync), week-info fallback table
  shared/
    ui/              # spartan helm components (generated by the spartan CLI, then owned by us)
    components/      # data-table (+ cell directive, pure logic), confirm-dialog, page-header, date-field, stepper
    csv/             # csv.util: dependency-free CSV parsing, delimiter detection, locale-tolerant numbers
    date/            # iso-date.util (serialization), date-format.util (display), date-parse.util (typed input) — deliberately separate
    lookups/         # cross-feature reference data (departments)
    pipes/           # localizedDate
    validators/      # reusable ValidatorFns
  features/
    auth/login, auth/forbidden
    dashboard/
    referential-crud/     # Countries: simple CRUD + advanced filter
    foreign-key-crud/     # Employees: department FK + locale-aware hire date
    multistep-form/       # Onboarding wizard
    interactive-grid/     # Order lines: add / duplicate / remove, save all
    admin/                # Users (Admin only)
  app.routes.ts
  app.config.ts
public/i18n/               # <lang>.json (root) and <scope>/<lang>.json (per feature)
mock-bff/                  # Express dev server, see docs/PROJECT_SPEC.md for contract
```

## Naming

- kebab-case filenames: `*.component.ts`, `*.service.ts`, `*.guard.ts`, `*.interceptor.ts`, `*.model.ts`, `*.store.ts`. Class names keep the type suffix (`ShellComponent`, `AuthService`); `angular.json` is configured so `ng generate` follows this (the CLI's 2025 style drops suffixes — we don't).
- One folder per component once it has its own template/style file. Inline template+style only for genuinely trivial components.
- Table column definitions live next to the feature that owns them, not in `shared/`, unless reused by two or more features.
- Helm files keep the names and `Hlm*` class/selector prefixes the spartan CLI generates (so future `ng g @spartan-ng/cli:ui` runs and healthchecks still match); our own shared components use the `app-` prefix.

## Auth / session rules

- No tokens in `localStorage`/`sessionStorage`, ever. The session lives in an httpOnly cookie set by the BFF; Angular code never sees or stores a raw token, only the `/bff/user` response (profile + roles).
- All BFF calls (`/bff/*`, `/api/*`) go through one functional `authInterceptor`:
  - always sends `withCredentials: true` and the `X-CSRF: 1` header (the BFF rejects cookie-authenticated mutations without it)
  - on `401`, tries `/bff/refresh` once, then retries the original request; if the refresh also fails, redirect to `/login`
  - on `403`, never retries — route to `/forbidden` (this is an authorization failure, not a session failure, and the two must not be conflated)
- Role/permission checks live only in `AuthService` (`hasRole()`, `hasAnyRole()`); never re-implemented ad hoc inside a component or the menu service.
- Who may access what is declared once in `ACCESS` (`core/auth/access-policy.ts`); route `data.roles`, menu items and in-component checks (e.g. `ACCESS.referentialWrite`) all reference it. Never hardcode role lists elsewhere.
- The client-side checks are UX only; the BFF enforces the same rules and is the real authority.

## Data table rules

- Every list uses the shared `<app-data-table>` (`shared/components/data-table`): Angular CDK table + spartan table styling (`hlmTable`, `hlmTr`, `hlmTh`, `hlmTd`), with the house defaults: sortable headers (click cycles none → asc → desc, `aria-sort`), a filter row (text box per column, or a dropdown for a fixed list of values), a global search, pagination with a page-size choice, skeleton rows while loading, and an empty state ("no rows" / "no matches" + "Clear filters"). All data is client-side; the pipeline filter → sort → paginate is pure functions in `data-table.logic.ts` (unit-tested).
- Features describe columns with our own `DataTableColumn<T>` (`data-table.model.ts`): `id`, `header` (translated), `value` (raw, used for sorting and dropdown filters), `display` (the text users see: translated/localized; search and text filters match it, so users filter on what they read), `sortable`, `filter` (`{ type: 'text' }` default, `{ type: 'select', options }`, or `false`), `align`, `cellClass`. No feature imports anything table-library-specific, so the implementation can change in one place.
- Column sets are a `computed()` so headers and formatters follow the language.
- Extra filtering (the "advanced filter") goes through the `externalFilter` input, not a second filtering mechanism.
- Row menus: pass `actions` (`RowAction<T>[]`); the table renders the "⋯" menu. Every row action reachable by double-click (`rowActivate`) must also be in the menu, for keyboard users (read-only users get "View").
- Custom cells (inline editing, badges, …): `<ng-template appCell="columnId" [appCellRows]="rows" let-row>` inside `<app-data-table>` (`appCellRows` only types `row`). Selection: `[selectable]="true"` + `[(selected)]` (row ids). Totals: `footer` (column id → text). Fixed height with sticky header/footer: `height`.
- Resolve foreign keys into the row model (`departmentName` on the row) rather than in a per-cell getter, so sorting/filtering work on the display value.
- File imports (CSV) are in-memory: read the file in the browser (`File.text()`), parse it with a pure, unit-tested function (`shared/csv/csv.util.ts` + a feature mapper), and hand the values to the store as new lines. An import never calls the server and never bypasses validation: unreadable values become `null` so the normal invalid-cell highlighting shows them, and saving stays the page's single "Save". No CSV library (none is needed, and fewer dependencies means fewer proxy and audit problems).
- Editable tables: cells are form controls (`appCell` templates) whose changes go to the feature store, which produces new rows; the table only renders the store's signal. Editable tables turn off sorting and column filters (a row must not move or vanish while it is being edited). Invalid cells use the control's `forceInvalid` + `aria-invalid`. `rowId` is required everywhere (CDK `trackBy`, so edits re-render rows in place and keep focus).
- Every dropdown or input in a table has an accessible name: a visually hidden `<label for>` pointing at the control (an `aria-label` on `hlm-select-trigger` lands on the wrapper, not on the button).
- CDK row definitions (`*cdkHeaderRowDef`, `*cdkFooterRowDef`) must exist from the first render; toggle visibility with a class, not `@if` (CDK ignores row defs added later).
- Styling comes from tokens like everything else (`bg-card`, `border`, `bg-muted/60` header, `data-state=selected` rows), so tables follow dark mode and the brand automatically. The table's own strings (pagination, empty states, filter labels) are root translations under `common.table`.
- Spartan's Data Table component is not used (it is built on TanStack Table, a dependency we don't take); spartan's Table *styling* directives are.
- E2E selectors: rows are `tr[cdk-row]`, the totals row `tr[cdk-footer-row]`, sortable headers `th[aria-sort] button`.

## UI components

- Setup: Tailwind v4 runs through Angular CLI's PostCSS support (`.postcssrc.json` → `@tailwindcss/postcss`). `src/styles.css` is the only global stylesheet: Tailwind imports, `@spartan-ng/brain/hlm-tailwind-preset.css`, the theme variables and the font. Component `.css` files are rarely needed; utilities live in templates. If a component stylesheet needs `@apply`, it must `@reference` `styles.css`.
- Build screens from helm components (`hlmBtn`, `hlmInput`, `hlmField`, `hlm-select`, `hlm-dialog`, `hlm-card`, ...) imported from `@spartan-ng/helm/<name>`. Feature code does not import `@spartan-ng/brain` directly except where helm documents it (e.g. `toast` from `@spartan-ng/brain/sonner`).
- House style is set in two places only: the theme tokens in `styles.css`, and the helm source in `shared/ui/`. Never restyle a helm component from a feature's CSS (no deep selectors, no `!important`); if every instance should look different, change the helm file; if one screen needs a variant, add a variant to the helm component (its `cva` variants).
- House edits made to helm so far (re-apply them if a component is regenerated): dialog, alert-dialog and card use `rounded-lg` (was `rounded-xl`); `hlmField` gap `gap-2` (was `gap-3`); card title `font-semibold`; `HlmDialogService` passes `ariaDescribedBy: null` and `HlmDialogDescription` links itself to its dialog after render (brain otherwise rewrites the CDK container config during change detection, NG0100 in dev).
- Behavior that spartan doesn't provide comes from the Angular CDK (the wizard's `CdkStepper`, drag-drop, `BreakpointObserver`) and is styled with Tailwind.
- Component mapping (so nobody reaches for a second library):

| Need | Use |
|---|---|
| App shell navigation | spartan Sidebar (collapsible; becomes a sheet on mobile) |
| Buttons, icon buttons | `hlmBtn` (`variant` / `size`), icon-only buttons always have an `aria-label` |
| Form field layout, labels, hints, errors | `hlmField`, `hlmFieldLabel`, `hlmFieldDescription`, `hlm-field-error`, `hlmFieldGroup` |
| Text / number / textarea | `hlmInput`, `hlmTextarea` |
| Select (single / multiple) | `hlm-select`; `hlm-combobox` when the list needs search |
| Checkbox, switch, radio | `hlm-checkbox`, `hlm-switch`, `hlm-radio-group` |
| Date input | `<app-date-field>` (`shared/components/date-field`), which wraps spartan's Date Picker; see "Dates" |
| Dialog (forms) / confirm | `HlmDialogService.open(Component, { context, contentClass })`; the dialog component reads `injectBrnDialogContext()` and closes through `BrnDialogRef`. Confirms go through `ConfirmDialogService.ask()` (`shared/components/confirm-dialog`, role `alertdialog`) |
| Toast (replaces snackbar) | Sonner: one `<hlm-toaster>` in the root component (inside `@defer (on idle)`, which keeps it out of the initial bundle), `toast.success()` / `toast.error()` |
| Menus (user menu, language, row actions) | `hlm-dropdown-menu` |
| Cards, badges, avatar, tooltip, separator, skeleton, spinner | the helm component of the same name |
| Wizard | `<app-stepper>` (`shared/components/stepper`), which extends `CdkStepper`, rendered with Tailwind |

## Look & feel

The rules the v1 Material build broke (a rounded nav highlight touching the square sidebar edge, form fields butting against each other, a switch floating next to a text field, three different corner radii). They apply to every screen.

- **Tokens only.** Colors come from semantic token utilities (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary text-primary-foreground`, `text-destructive`, `ring-ring`, `bg-sidebar-accent`, `--chart-1..5`). Never Tailwind palette colors (`bg-blue-500`), never hex/rgb/oklch literals in components, and no arbitrary values (`p-[13px]`) unless there is no other way (leave a comment saying why).
- **One radius scale.** Everything derives from `--radius` (0.5rem): `rounded-md` for controls, buttons, nav items and menus; `rounded-lg` for cards, dialogs, popovers and the table container. `rounded-full` only for avatars, badges, switches and dots. No pill-shaped buttons.
- **Nothing touches its container edge.** Highlighted and hovered items (nav items, menu items, list rows) sit inset in a padded container (`p-2` group, `gap-1` between items) and are rounded on all four corners. The sidebar's active item = `bg-sidebar-accent text-sidebar-accent-foreground font-medium`, with no left bar and no half-rounded shapes.
- **One control height.** Inputs, selects, date fields and default buttons share the helm default height (`h-9`); `size="sm"` only in dense toolbars and grid cells. Controls are `w-full` of their layout cell, never sized by content.
- **Spacing (4 px Tailwind scale only).** Page content `p-4 md:p-6`, max width `max-w-screen-2xl mx-auto`; `gap-6` between page sections and between cards; card padding from the helm card (`p-6`); `gap-4` between form fields; `gap-2` between a label, control, hint and error, and between buttons in a group.
- **Typography.** One sans font set once as `--font-sans`. Page title `text-2xl font-semibold tracking-tight`, page subtitle `text-sm text-muted-foreground`, card title `text-base font-semibold`, body/UI text `text-sm`, KPI numbers `text-3xl font-semibold tabular-nums`. Long French strings wrap or truncate with a `title`; they never overflow or push layout (e.g. the app title next to the logo is clamped to two lines).
- **Forms.**
  - Every control sits in an `hlmField`: label **above** the control, then optional description, then errors. No floating labels, no placeholder used as a label. Required fields show a `*` in the label.
  - Layout is a CSS grid: `grid gap-4` (one column) by default; `sm:grid-cols-2` only to pair short related fields (code + name, first + last name). A field that needs more width spans `sm:col-span-2`. Never place fields side by side with flex and no gap.
  - Checkboxes and switches use `hlmField orientation="horizontal"` (control, then label and description) on their **own row**, not next to a text input. A group of checkboxes is an `hlmFieldSet` with an `hlmFieldLegend`.
  - Errors show once the control is touched or a submit was attempted, one message at a time, in `text-destructive text-sm`.
- **Dialogs.** Content width `sm:max-w-lg` (`sm:max-w-2xl` for two-column forms); header = title + one-line description; body = the form grid; footer right-aligned with `gap-2`: secondary action `variant="outline"`, primary action default variant, labelled with a verb ("Save", "Delete"). Destructive confirms use `variant="destructive"`.
- **Page skeleton.** Every feature page = `<app-page-header>` (title, subtitle, right-aligned actions) + content. Toolbars above grids: search input left, actions right, wrapping on narrow screens.
- **States.** Loading shows skeletons that have the same shape as the content, not a centered spinner on a blank page; empty states use a muted icon + one sentence + optional action; focus rings are never removed (`focus-visible:ring-*` from helm).
- **Check before calling a screen done:** light + dark, `en` + `fr`, 1440 px and 390 px wide.

## Theming (dark mode)

- Theme = CSS variables generated by spartan's CLI (`init --theme neutral`, or `ui-theme`) into `styles.css` (`:root` for light, `.dark` for dark), using spartan's variable names (`--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`, `--sidebar-*`, `--chart-1..5`, plus our `--success` for positive trends). Tailwind maps them to utilities, so `bg-card` etc. just work. To rebrand, edit these variables and nothing else.
- One `ThemeService` (`core/layout/theme.service.ts`): a `isDark` signal, defaults to `window.matchMedia('(prefers-color-scheme: dark)')` on first load, then persisted to `localStorage` (a UI preference, not session/auth state — this does not violate the no-token-in-storage rule).
- Toggling adds/removes the `dark` class on `<html>` (spartan's convention; Tailwind's `dark:` variant is bound to the same class) and sets `color-scheme` so native controls and scrollbars follow. Because every component reads token variables, that is the entire mechanism. `dark:` utilities should be rare; no component branches on dark/light in TypeScript.
- Canvas charts need concrete colors: the dashboard reads `--chart-1..5`, `--foreground`, `--muted-foreground`, `--border` and `--card` with `getComputedStyle(document.documentElement)` (`chart-palette.ts`) and recomputes when `ThemeService.isDark` changes. The tokens are `oklch()`, which Chart.js' color helpers can't parse, so each is converted to `rgb()` through a 1×1 canvas.
- Toggle control lives in the topbar, next to the language switcher (also on the login page).

## Brand

- Logo: `public/logo.svg`, 80×80 (currently a placeholder in the brand colors; replace the file, keeping the name, or update the three `src="logo.svg"` references: shell sidebar header, shell mobile topbar, login card). It is also the favicon.
- Brand colors: `#479595` (teal) and `#2e6a56` (deep green), mapped onto the theme tokens in `styles.css`, never used directly in components:
  - light: `--primary` / `--sidebar-primary` = `#2e6a56` (white text on it is 6.3:1); `--ring` and `--chart-1` = `#479595`; `--chart-2` = `#2e6a56`; `--accent` / `--sidebar-accent` are light teal tints; neutrals carry a faint teal tint (hue ~190).
  - dark: `--primary` is a lightened teal with dark text; charts use lightened versions of both colors.
  - Don't put white text on `#479595` (3.5:1, fails WCAG AA for body text).
- Header height: `--app-header-height` (6rem = 80 px logo + 8 px padding) sizes the sidebar's brand row and, from `md` up, the topbar, so both bottom borders line up. Below `md` the topbar is `h-14` with a 32 px logo next to the menu button; the collapsed icon rail shows the logo at 32 px.

## i18n — built to be removable

We want translation support, but confined so it can be ripped out later without touching feature code broadly. Use **Transloco** (not `@angular/localize`) specifically because it's a runtime library behind a service/pipe, not a compiler-level feature baked into every template.

- All wiring lives in `core/i18n/` (config, loader, a single `provideI18n()` called once from `app.config.ts`). Nothing outside that folder imports `@jsverse/transloco`; the app imports only from `core/i18n` (its `index.ts`).
- Templates use the `transloco` pipe. TypeScript that needs text (grid headers, chart labels, toasts) uses `translateGroup<'a' | 'b'>('scope.group')` — a typed, reactive signal. Never inject `TranslocoService` in feature code (the language switcher in `core/i18n/` is the one exception).
- Strings read through `translateGroup()` that need parameters use single braces (`"Delete {name}?"`) filled with `interpolate(text, { name })` — Transloco would blank out `{{name}}` when the group is read without params. Template strings keep `{{param}}` with `| transloco: { param }`.
- Specs that render translated templates use `provideI18nTesting()` (`core/i18n/testing.ts`), never Transloco directly.
- Keys are always the full path, identical in templates and TypeScript (`countries.columns.name`); `autoPrefixKeys` is off on purpose.
- Root strings: `public/i18n/<lang>.json`. Per-feature strings: `public/i18n/<scope>/<lang>.json`, attached to the feature route with `...i18nScope('<scope>')`, which provides the scope and preloads it before the route activates (no flash of raw keys). Deleting a feature deletes its translations with it.
- Ship two locales to prove the mechanism: `en` (default) and `fr`. Don't add more without being asked. The chosen language persists in `localStorage` (`app.lang`) and falls back to the browser language.
- "Easy plug out" means: confined blast radius, not a runtime on/off switch. Removing i18n = delete `core/i18n/` and `public/i18n/`, then fix what the compiler reports: the `provideI18n()` call, `i18nScope()` spreads in routes, `| transloco` in templates (→ literal text), `translateGroup()` calls (→ constant objects), `interpolate()` (→ template literals), and `<app-language-switcher>`. Dates keep working: `LocaleService` stays on `DEFAULT_LOCALE`.

## Dates

- Locale data for every shipped language (`en`, `fr`) is registered once at bootstrap (`registerLocaleData` from `@angular/common/locales/fr` etc. in `app.config.ts`) — required for locale-aware formatting to work at all.
- Display formatting only ever goes through the shared `formatLocalizedDate()` util (`shared/date/date-format.util.ts`) and its template wrapper, the `localizedDate` pipe. Both take the current locale from `LocaleService.locale` (`core/locale/`), which the i18n layer updates on language change — never hardcode a locale string, never rely on the compiled `LOCALE_ID`/default `DatePipe` behavior. Table columns' `display` functions call the same util directly (pipes are template-only, columns need a plain function) — one formatting implementation, two call sites. Numbers/currency: `DecimalPipe` or `Intl.NumberFormat` with the same locale signal.
- Date input goes through one shared component, `<app-date-field>` (`shared/components/date-field`), which wraps spartan's Date Picker (typed input + calendar popover):
  - It is a `ControlValueAccessor` whose value is an **ISO `yyyy-MM-dd` string or `null`**, so forms hold `FormControl<string | null>` and never see a `Date`. It converts to and from the picker's `Date` internally with `fromIsoDate()` / `toIsoDate()`.
  - It also implements `Validator`: text that can't be parsed (or an impossible date like `31/02/2026`) sets an `invalidDate` error. It never silently clears the field or rolls the date over. `min`/`max` inputs take ISO strings.
  - The field binds locale-aware functions to the picker's inputs (`[formatDate]`, `[parseDate]`, `[formatInputDate]`), rebuilt as `computed()`s when `LocaleService.locale()` changes. Display is numeric (`formatNumericDate()`: `4/9/2026` / `09/04/2026`). Parsing uses `parseLocalizedDate(text, locale)` (`shared/date/date-parse.util.ts`, pure and unit-tested): typed numeric dates follow the locale's day/month order (`09/04/2026` is 9 April in `fr`, September 4 in `en`), ISO input is always accepted, and impossible dates are `null`.
  - On a language change, the field re-formats its displayed text. The calendar's month/weekday names, header, first day of week and navigation labels come from spartan's global calendar i18n, kept in step with `LocaleService` by `CalendarLocaleSync` (`core/locale/calendar-locale.ts`, injected by the date field so calendar code stays out of the initial bundle; its effect calls `use()` inside `untracked()` because `use()` reads the signal it writes). First day of week comes from `Intl.Locale` week info, with a fallback table in `core/locale/week-info.ts`.
  - The calendar's ARIA labels ("Previous month", "Choose date", ...) are translated like any other string.
- Values are ISO `yyyy-MM-dd` strings everywhere in the app's models, forms and on the wire. The only place a `Date` exists is inside `<app-date-field>` and the picker it wraps. Conversion goes through `shared/date/iso-date.util.ts` (local calendar fields, never `toISOString()`, which shifts the day east of UTC). Locale formatting/parsing and ISO serialization are different code paths and must never be merged into one.
- Table date columns: `value` returns the raw ISO string (it sorts correctly as text), `display` the localized date (what search and the text filter match).

## Testing

- Every service with real logic (auth, role filtering, form validators, row mutation logic) gets unit tests.
- Components are tested for behavior (does clicking X call Y, is a disabled state respected), not for template rendering trivia.
- HTTP code is tested with `provideHttpClientTesting()` + `HttpTestingController`; Vitest globals (`describe`, `it`, `expect`, `vi`) are available without imports.
- Date tests must not depend on the machine's timezone — assert on calendar fields, not on `toISOString()` output.
- `<app-date-field>` gets behavior tests: typing `09/04/2026` under `fr` emits `'2026-04-09'`, an impossible date sets `invalidDate`, `writeValue('2021-03-15')` shows the localized text.
- Helm components generated by the CLI aren't unit-tested unless we change their behavior (a style-only change doesn't need a test).

## Explicitly out of scope / do not do

- No NgRx, Akita, or other state management library.
- No Angular Material and no second component or CSS library (no Material, PrimeNG, Bootstrap, DaisyUI, Flowbite, ...). Tailwind + spartan/ui + Angular CDK only. Spartan's own Chart and Data Table components are also off-limits (ng2-charts and our CDK-based `<app-data-table>` own those jobs).
- No Sass/SCSS files; no editing of `@spartan-ng/brain` (upgrade it through npm).
- No class-based guards, interceptors, or resolvers.
- No package with a paid/premium tier, free edition included (the corporate proxy blocks them): no AG Grid, Kendo, Syncfusion, DevExtreme, Handsontable, ….
- No token storage in browser storage APIs.
- No `@angular/localize` — i18n is Transloco only.
- No second charting library alongside ng2-charts.
