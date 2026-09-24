# Traducciones en JSON + política de agentes

- Plan date: 2026-07-20 (America/Caracas)
- Status: completed
- Repositories: home-front
- Approved by: user (plan attachment confirmation)

## Context and outcome

UI strings leave the monolothic TypeScript catalogs in `I18nService` and live in tracked `en.json` / `es.json` under `home-front/src/app/core/i18n/`. Agents and policies document that folder as the sole source of truth for translations.

## Scope

### API

- No code changes. Impact review only: no HTTP/OpenAPI impact.

### Frontend

- Extract EN/ES maps to `en.json` and `es.json`.
- Slim `I18nService` to import those files; keep `lang()`, `t()`, `setLang()`, `translate()` API.
- Enable `resolveJsonModule` in `tsconfig.json`.
- Update `home-front/AGENTS.md` and `contexts/app.context.md`.
- Update workspace agent policies/rules for the i18n format.

## Contracts and compatibility

- Unchanged. No API or OpenAPI regeneration.

## Data, tasks, caching, and security

- Language preference remains in `localStorage` (`app_lang`). No PWA cache changes.

## Acceptance criteria

- [x] Translations live in `home-front/src/app/core/i18n/en.json` and `es.json` with matching camelCase keys.
- [x] `I18nService` reads catalogs from those JSON files (static import), not embedded EN/ES objects.
- [x] Existing `i18n.t(...)` call sites keep working without key renames.
- [x] Agent/policy docs state JSON files as the translation source of truth and required format.
- [x] TypeScript app compile and relevant checks pass; QA PASS.

## Verification plan

- `npx tsc -p tsconfig.app.json --noEmit`
- Targeted specs that use `I18nService` if present
- `npm run build:prod` when feasible
- QA gate on plan + diffs

## Risks and non-goals

- No ngx-translate / `@angular/localize`.
- No HTTP-loaded catalogs.
- No key renames or call-site churn.

## Approved amendments

- None.

---

## Final result

- Completion date: 2026-07-20 (America/Caracas)
- QA verdict: PASS

### Delivered

- **home-front:** `en.json` / `es.json` (224 keys), slim `I18nService`, `resolveJsonModule`, docs in `AGENTS.md` and `contexts/app.context.md`.
- **workspace agents:** policies/rules/agents updated so translations come only from those JSON files.
- **home-api:** impact review only — no code changes.

### Deviations from approved plan

- None.

### Verification evidence

- Key parity `en.json`/`es.json` — 224 keys, match
- `npx tsc -p tsconfig.app.json --noEmit` — exit 0
- `npx tsc -p tsconfig.spec.json --noEmit` — exit 0
- `npm run build:prod` — exit 0 (jszip CommonJS warning pre-existing)
- ChromeHeadless full suite — skipped by QA (dirty tree unrelated to this feature; no dedicated i18n spec)

### Migrations and contracts

- None. OpenAPI / generated types unchanged.

### Commits

- None (orchestrator did not commit).

### Residual risks and follow-up

- `es as Record<AppStringKey, string>` does not enforce ES key parity at compile time; rely on reviews/QA.
- No dedicated `i18n.service.spec.ts` (pre-existing gap).

### External actions

- Push: no
- Merge: no
- Deploy: no
- Production migrations: no
