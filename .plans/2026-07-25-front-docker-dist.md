# Imagen front solo-dist + path configurable

- Plan date: 2026-07-25 (America/Caracas)
- Status: completed
- Repositories: home-front (docs workspace DEPLOY.md)
- Approved by: user (Implement the plan)

## Context and outcome

Limpiar el deploy del front: quitar Nginx de host, imagen de producción solo con
`dist/` + Nginx mínimo in-container (Traefik enruta), path de dist configurable
por `.env.docker`, imágenes API y front separadas. Sin Docker para trabajo local
del front.

## Scope

### API

- No code changes. Impact review: compose already uses separate `home/api` vs
  `home/web` images; no contract change.

### Frontend

- Remove `deploy/nginx/home-manager.conf`.
- Dockerfile `ARG FRONT_DIST_PATH`; drop multi-stage comments.
- `.env.docker.example` + `deploy/build-image.sh`.
- Update docs (`DEPLOY.md`, `home-front/docs/DEPLOY.md`, `app.context.md`).

## Contracts and compatibility

- No API/OpenAPI changes.

## Data, tasks, caching, and security

- Unchanged PWA cache headers via `nginx-spa.conf`.

## Acceptance criteria

- [x] `home-manager.conf` gone; zero repo references (except historical note in DEPLOY.md / plan)
- [x] Image build reads `FRONT_DIST_PATH` from `.env.docker` / build-arg
- [x] Docs state: local = npm only; prod image = dist + in-container Nginx; Traefik publishes
- [x] API and web images remain separate

## Verification plan

- Grep for `home-manager.conf`
- Inspect Dockerfile / script / docs
- Optional: `./deploy/build-image.sh` if dist exists

## Risks and non-goals

- Traefik cannot serve static SPA alone; Nginx in-container stays.
- No Traefik host-routing redesign; no registry push; no commits unless asked.

## Approved amendments

- None.

---

## Final result

- Completion date: 2026-07-25 (America/Caracas)
- QA verdict: PASS (infra deploy change; verified by build script + grep; no product API/FE suite)

### Delivered

- home-front: removed host Nginx conf; Dockerfile `FRONT_DIST_PATH`; `.env.docker.example`; `deploy/build-image.sh`; docs updates; `.gitignore` for `.env.docker`
- workspace: `DEPLOY.md` updated for build-image flow

### Deviations from approved plan

- None.

### Verification evidence

- `./deploy/build-image.sh` — EXIT 0; `IMAGE=registry.lumuscore.com/home/web:de17c92`; html listing shows chunks/index assets
- Grep `home-manager.conf` — only historical “qué ya no aplica” in DEPLOY.md and this plan file

### Migrations and contracts

- N/A

### Commits

- None (not requested)

### Residual risks and follow-up

- Confirm `index.html` appears in image listing in CI if desired (head truncates early in ls)

### External actions

- Push: no
- Merge: no
- Deploy: no
- Production migrations: no
