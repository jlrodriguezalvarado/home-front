# Angular frontend repository guidance

This repository (`home-front`) is the Angular 22 client half of the Home product. All remote application data comes from the Django API in sibling `../home-api` via `environment.apiUrl` / `wsUrl`.

## Jose knowledge base

Cross-project engineering knowledge (global rules, anti-patterns, patterns) lives in `~/projects/jose-knowledge-base` (WSL). On Windows, use the cloned vault path.

Before implementing: read that vault's `AGENTS.md` and `00-System/AI-Instructions.md`, then this file.

- This repository remains the source of truth for code, HTTP contracts, and this product's workflow (`.plans/`, `.cursor/`, `.agents/`).
- The vault does not make this repo read-only.
- Do not copy vault notes into this repo. Link or follow them.
- Global examples: no `window.confirm`/`alert` for business UI; reuse existing helpers; OpenAPI/Swagger only on the local machine, never on deployed development/production.

Cloud / remote agents usually cannot read the vault. Put **task-relevant** vault constraints into the approved `.plans/` file (vault: `00-System/Integrations/Cloud-Agents.md`).

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
- Never duplicate domain helpers. Search existing shared modules/services first and reuse or extend them; do not reimplement the same helper in a new call site.
- Preserve decimal strings at the HTTP boundary; normalize errors via `AppError`.
- UI strings only in `src/app/core/i18n/en.json` and `es.json`.
- Keep `environment.prod.ts` local and ignored.
- Do not push, merge, deploy, or force dependency upgrades without authorization.
- Do not skip ownership or QA gates.
- After a repeatable agent failure, follow `.agents/policies/continuous-improvement.md` (or a parent harness directive) before declaring done.
