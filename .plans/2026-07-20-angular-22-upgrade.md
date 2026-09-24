# Upgrade Angular 19 → 22

- Plan date: 2026-07-20 (America/Caracas)
- Status: approved
- Repositories: home-front
- Approved by: user (explicit request to upgrade and update agent config)

## Context and outcome

Bring `home-front` onto the current active Angular release (v22) for security support and modern defaults, and keep agent/policy docs aligned so implementation agents target Angular 22.

## Scope

### API

- No code changes. Impact review only: OpenAPI consumer remains Angular; no contract change.

### Frontend

- Sequential `ng update`: 19 → 20 → 21 → 22 (one major at a time).
- Apply CLI migrations (including change-detection defaults if offered).
- Align TypeScript / Node requirements for Angular 22 (TS 6+, Node 22+; environment already on Node 24).
- Update workspace agent docs that still say Angular 19.
- Do not adopt Signal Forms, zoneless CD, or Vitest as part of this upgrade unless required for a green build.

## Contracts and compatibility

- No HTTP/OpenAPI contract changes.
- Regenerate types only if build tooling requires it; otherwise leave generated schema untouched.

## Data, tasks, caching, and security

- Keep existing zone.js + service worker setup unless a migration forces a compatible change.
- Do not change PWA cache policy for authenticated API data.

## Acceptance criteria

- [x] `@angular/*` packages at major 22
- [x] `npx tsc -p tsconfig.app.json --noEmit` passes
- [x] `npm run build:prod` passes (or documented blocking failure fixed)
- [x] Agent/policy docs state Angular 22 (`AGENTS.md`, `.agents/policies/angular-frontend.md`, related agent prompts)

## Verification plan

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run build:prod
```

Optional if environment allows: `npm test -- --watch=false --browsers=ChromeHeadless`

## Risks and non-goals

- Breaking changes across three majors (OnPush default in v22, Fetch HTTP default, TS 6).
- Non-goal: rewrite forms to Signal Forms, remove zone.js, switch test runner to Vitest, or redesign UI.

## Approved amendments

- None yet.

---

## Final result

- Completion date: 2026-07-20 (America/Caracas)
- Status: completed
- QA verdict: PASS

### Delivered

- **home-front:** sequential `ng update` 19→20→21→22 (`@angular/*` `22.0.7`, TypeScript `~6.0.3`). CLI migrations: control-flow (`@if`/`@for`), `ChangeDetectionStrategy.Eager` on components, `provideHttpClient(withXhr())` to keep upload progress, TS6 VAPID `Uint8Array<ArrayBuffer>` fix, HostListener `Event` typing in `dialog-form.directive.ts`.
- **home-api:** no application code changes (impact review only).
- **Agent/docs:** Angular 22 in root `AGENTS.md`, `.agents/policies/angular-frontend.md`, `.cursor/agents/angular-frontend.md`, `.cursor/rules/angular-frontend.mdc`, `home-front/AGENTS.md`, `README.md`, `contexts/app.context.md`.

### Deviations from approved plan

- None material. Control-flow migration ran as part of the v21 core migrations (expected CLI behavior).

### Verification evidence

- `npx tsc -p tsconfig.app.json --noEmit` — PASS
- `npx tsc -p tsconfig.spec.json --noEmit` — PASS (QA)
- `npm run build:prod` — PASS; initial bundle 487.60 kB; CommonJS warning for `jszip`
- `npm audit --omit=dev` — 0 vulnerabilities (QA)
- `npm test` — not verified in RO sandbox (cache mkdir); not treated as product FAIL

### Migrations and contracts

- No Django migrations. No OpenAPI/generated type changes. HttpClient remains XHR-backed via `withXhr()`.

### Commits

- None created (orchestrator did not commit).

### Residual risks and follow-up

- Karma builder deprecated; Vitest migration optional later.
- Browser unit tests not re-run in this environment.
- Pre-existing `.codex/config.toml` deletion in dirty worktrees (unrelated).

### External actions

- Push: no
- Merge: no
- Deploy: no
- Production migrations: no
