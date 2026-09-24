# Feature delivery workflow (home-front)

## 1. Plan with the user

Identify outcome, non-goals, UI impact, API contract needs, OpenAPI/types regeneration, PWA/i18n, tests, and risks. Wait for explicit approval before implementation.

## 2. Record the approved plan

- Front-only: create `.plans/YYYY-MM-DD-<slug>.md` from `.plans/TEMPLATE.md`.
- Cross (needs API changes): plan belongs in `../home-api/.plans/` (contract owner). If opened here alone and the scope becomes cross, stop and record/continue from that API plan (or open parent `home/`).

## Open a feature branch

Unless the change is trivial (typo, comment, one-file docs) and does not warrant a plan: create or checkout `feature/<kebab-slug>` from up-to-date `develop` in each affected repo (same slug on API and front). Work as Jose (`jlrodriguez`) locally or in the cloud (`cloud_base_branch` = that feature, never `develop`). Do not implement on `develop`. Merge to `develop` only after QA and explicit authorization.

## 3. Implement by ownership

- Use the `angular-frontend` subagent (`.cursor/agents/angular-frontend.md`).
- Read `.agents/policies/angular-frontend.md` and `.agents/policies/integration.md`.
- Consume Django contracts from sibling `../home-api`; regenerate types from `../home-api/docs/openapi.yaml` when the schema changed.
- Do not invent incompatible transport shapes.

## 4. QA gate

After implementation (and after API is integrated when cross), run `qa`. Do not declare complete without PASS (or an explicit user waiver in the plan).

## 5. Record the final result

Append results to the plan file in use (this `.plans/` or the referenced `home-api/.plans/` file).

## 6. Harden the harness when failures repeat

If a preventable agent mistake class appeared (or parent `home/` issued a harness directive), follow `.agents/policies/continuous-improvement.md`: land a rule, policy, test, or workflow constraint in this repo (and require the sibling when cross-layer). Record under `### Harness improvements` in the plan before calling the work done.
