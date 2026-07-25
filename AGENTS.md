# Angular frontend repository guidance

This repository (`home-front`) is the Angular 22 client half of the Home product. All remote application data comes from the Django API in sibling `../home-api` via `environment.apiUrl` / `wsUrl`.

## Sources of truth (this repo)

- `.agents/WORKFLOW.md` — lifecycle
- `.agents/HANDOFF.md` — delegation block
- `.agents/policies/angular-frontend.md` — engineering rules
- `.agents/policies/integration.md` — cross-layer contracts
- `.agents/policies/qa.md` — QA gate
- `.agents/policies/continuous-improvement.md` — turn repeatable agent failures into kit defenses
- `.cursor/agents/angular-frontend.md` / `qa.md`
- Front-only plans under `.plans/`
- Cross plans under `../home-api/.plans/` (contract owner)

## Sibling

| Sibling | Role |
|---------|------|
| `../home-api` | Contract owner; OpenAPI at `docs/openapi.yaml` |

Regenerate types with `npm run api:types` / `api:types:check`. Never hand-edit `src/app/core/api/generated/`.

## Parent workspace

Opening parent `home/` loads root `AGENTS.md` plus root `.cursor/agents/` for full-feature orchestration. Detail still lives in this kit and in `home-api`’s kit.

## Safeguards

- Colocate feature DTOs/mappers/repositories; respect feature folder layout.
- Preserve decimal strings at the HTTP boundary; normalize errors via `AppError`.
- UI strings only in `src/app/core/i18n/en.json` and `es.json`.
- Keep `environment.prod.ts` local and ignored.
- Do not push, merge, deploy, or force dependency upgrades without authorization.
- Do not skip ownership or QA gates.
- After a repeatable agent failure, follow `.agents/policies/continuous-improvement.md` (or a parent harness directive) before declaring done.
