# Angular frontend repository guidance

This repository is the frontend half of the shared workspace. Before any feature work, read `../.agents/WORKFLOW.md`, the approved dated file under `../.plans/`, and `../.agents/policies/angular-frontend.md` when those shared files are available.

Use the `angular_frontend` custom agent for implementation and the `qa` agent after both layers are integrated. Consume the approved API contract; do not invent an incompatible transport shape.
If repository-local custom agents are unavailable, trust this project in Codex or reopen the parent `home` workspace; do not silently skip the required ownership and QA gates.

Fallback rules when the shared workspace files are unavailable:

- Keep DTOs, domain models, mappers, repositories, and feature endpoints close to their feature.
- Keep generated OpenAPI code isolated and current; do not edit generated types manually.
- Preserve decimals losslessly and use strict types without `any` or false casts.
- Use `switchMap`, `finalize`, and `takeUntilDestroyed` to prevent stale requests and lifecycle leaks.
- Share concurrent JWT refreshes and normalize errors centrally.
- Never cache authenticated API data or mutations without an approved policy; clear user-scoped state on logout.
- Run TypeScript, generated-type checks, browser specs, and the production build before completion.
- Keep `src/environments/environment.prod.ts` local and ignored. Do not push, merge, deploy, or force dependency upgrades without explicit authorization.
