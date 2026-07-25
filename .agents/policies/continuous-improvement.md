# Continuous improvement (harness) — home-front

Keep aligned with `../home-api/.agents/policies/continuous-improvement.md` for the shared loop. Layer landing zones differ below.

Companion policies: `angular-frontend.md`, `integration.md`, `qa.md`.

## Principle

When an agent (or human correcting an agent) hits a **repeatable** failure, fixing application code alone is not enough. Land a durable defense in **this** kit so the next run cannot make the same mistake silently.

## When to trigger

Trigger after any of:

- The same mistake class appears twice in a session or across recent plans.
- QA `FAIL` / `BLOCKED` with a clear preventable cause (missing check, wrong ownership, contract drift, skipped gate).
- The user corrects a pattern the agent should have known from policy/rules.
- Parent workspace (`home/`) issues a harness directive naming this repo.

Do **not** invent process for one-off typos or unique product decisions.

## Loop (this repo owns its landing)

1. **Name the failure class** in one line (e.g. “Hand-edited generated OpenAPI types”).
2. **Choose the smallest durable defense** (prefer earlier gates):
   - **Rule** — `.cursor/rules/*.mdc` or a bullet in an existing always-apply rule.
   - **Policy** — `.agents/policies/*.md` (prefer editing an existing policy over a new file).
   - **Workflow / HANDOFF** — only if the lifecycle or delegation shape was wrong.
   - **Test** — regression spec when behavior can be asserted.
   - **Plan template / checklist** — only if the gap is planning/verification coverage.
3. **Apply the change in this repository** (and sibling only if the failure is cross-layer — see Root).
4. **Record** under the active plan’s `### Harness improvements` (date, failure class, artifact path, why it prevents recurrence).
5. Continue the feature; do not declare complete while a required harness item for this failure is still open.

## Landing zones (frontend)

| Failure class (examples) | Prefer |
|--------------------------|--------|
| Feature folders / DTOs / mappers / repositories | `policies/angular-frontend.md` + feature-folder Cursor rule if needed |
| Contract consumption / generated types / decimals / AppError | `policies/integration.md` or `angular-frontend.md` + spec |
| i18n / PWA / environment secrets | `policies/angular-frontend.md` or `qa.md` evidence bullets |
| Ownership / wrong repo edits | `AGENTS.md`, `HANDOFF.md`, agent preload |
| QA skipped or weak evidence | `policies/qa.md` (keep aligned with home-api) |
| Cursor-session habit | `.cursor/rules/workflow.mdc` or a focused `.mdc` |

## Sibling and parent

- **Sibling-only API failure**: do not change this repo; note follow-up for `home-api` in the plan.
- **Cross-layer failure**: apply the front-side defense here; require the matching API-side defense in `home-api` (or accept an explicit “none — front-only root cause” in the plan).
- **Opened from parent `home/`**: follow the root harness directive in `home/AGENTS.md`. Root decides *which* repos act; each repo decides *how* to land per this policy.

## Anti-patterns

- Fixing only the feature code and hoping memory holds.
- Duplicating the same rule in three places; one clear SoT plus a short pointer is enough.
- Weakening tests or deleting checks to “pass”.
- Writing long essays; defenses must be short and actionable.
