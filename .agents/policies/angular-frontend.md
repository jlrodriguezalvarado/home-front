# Angular frontend engineering policy

Keep aligned with sibling awareness in `../home-api/.agents/policies/integration.md`.

Companion policies: `integration.md` (Django data source) and `qa.md` (final gate).

## Architecture and typing

- Stack: Angular 22, standalone APIs, RxJS, signals, Angular Service Worker, strict TypeScript 6+, Node 22+.
- Defaults after the v22 upgrade: components keep `ChangeDetectionStrategy.Eager` where migrated; `provideHttpClient(withXhr(), …)` preserves upload progress (`reportProgress`). Do not switch to zoneless, Signal Forms, or Vitest without an approved plan.
- Data source: Django API in sibling `home-api` via `environment.apiUrl` / `wsUrl`. Do not add parallel backends or invent undocumented endpoints.
- Keep feature-specific DTOs, models, mappers, repositories, and endpoints inside the feature. `core` is for genuinely cross-cutting behavior.
- Generated OpenAPI types belong in `src/app/core/api/generated/`; regenerate them from `../home-api/docs/openapi.yaml` and never edit them manually.
- Map transport DTOs into domain models. Keep monetary/decimal HTTP values as strings until deliberate decimal arithmetic.
- Do not introduce `any`, unsafe non-null assertions, or casts that merely silence a mismatch. Narrow unknown input with validation or type guards.
- Preserve public import compatibility with deliberate reexports during progressive moves.
- Before creating a new feature folder, copy the structure of the closest existing feature in the same domain.

## Feature component folder layout (mandatory)

Apply under `src/app/features/` (and the same idea when nesting under `shared/`):

1. **Root / routed feature page** — lives in its feature folder with matching file names:
   - `features/finance/finance-dashboard/finance-dashboard.component.{ts,html,scss}` (or the feature’s established root naming)
2. **Routed child** (has its own route / is navigated to) — **not** loose files in the feature root. Own subfolder named after the component:
   - `features/chat/conversation-room/...`
   - `features/finance/income-account-form/...`
3. **Parent-only child** (embedded in the parent template, no dedicated route) — under `components/`, each in its own named folder:
   - `features/chat/components/chat-media-composer/...`
   - `features/finance/finance-dashboard/components/...`

Do not leave routed screens as sibling loose files next to a feature root. Do not put routed screens under `components/`. Mirror `chat` / `finance` when unsure.

## HTTP, auth, errors, and state

- Use canonical API routes while the backend retains legacy aliases.
- Normalize pagination and errors centrally. UI code consumes `AppError`, not raw `HttpErrorResponse` parsing scattered across components.
- Concurrent 401 responses must share one refresh request; final refresh failure clears the session and disconnects user-scoped realtime state.
- Cancel obsolete requests with `switchMap` or explicit replacement subscriptions. Use `finalize` for loading flags and `takeUntilDestroyed` for component-owned streams.
- Avoid nested subscriptions and duplicate requests. Add a facade/store only for genuinely shared or complex state. NgRx requires explicit approval.

## i18n

- Source of truth for UI strings: `src/app/core/i18n/en.json` and `src/app/core/i18n/es.json` (flat camelCase key → string).
- After adding/removing keys in `en.json`, run `npm run i18n:keys` so `app-string-key.ts` stays in sync (`AppStringKey` is generated; do not hand-edit).
- Add every new key to **both** files with the same key. Do not embed EN/ES catalogs in TypeScript.
- `I18nService` imports those JSON files statically; components use `i18n.t('key')` with keys typed from `AppStringKey`.
- Do not introduce ngx-translate, `@angular/localize`, or HTTP-loaded catalogs without an approved plan.

## PWA and local data

- Never cache authenticated API responses, financial data, media, health endpoints, or mutations without an explicit reviewed policy.
- Keep user-scoped storage keys centrally registered and cleared on logout. Preserve device-scoped theme and language preferences.
- Treat offline data as potentially stale and expose connectivity/update state deliberately.
- `src/environments/environment.prod.ts` remains local, ignored, and must not be staged.

## Styles (Tailwind + SCSS)

- Do **not** `@apply` Tailwind opacity modifiers on theme color utilities backed by CSS variables (e.g. `bg-error-container/30`, `bg-primary/20`). Sass/Tailwind build fails with “class does not exist”.
- Prefer full utility classes in the template, or plain CSS with `var(--md-*)` and `color-mix(...)`.
- After any component `.scss` / style change in a feature, run `npm run build:prod` before claiming the feature build-ready.

## Verification

Run focused checks while iterating, then the full matrix before QA:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.spec.json --noEmit
npm run api:types:check
npm test -- --watch=false --browsers=ChromeHeadless
npm run build:prod
```

- Keep the configured initial bundle budget.
- Report CommonJS warnings and `npm audit` findings; never run `npm audit fix --force` or a major framework upgrade without an approved plan.
- Run E2E only when infrastructure already exists or its introduction was approved.
