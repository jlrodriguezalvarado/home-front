# Deploy — home-front (Traefik + registry privado)

Guía **interna** para publicar la PWA Angular (**home-front**) sobre la
infraestructura de
[`secure-docker-infrastructure`](../../deploy/secure-docker-infrastructure)
(Traefik, Let's Encrypt, registry privado, CrowdSec). **No usa Nginx en el host.**

El stack Compose de producción (api + worker + beat + web + db + redis), el
`.env` del servidor y `deploy.sh` viven en el repo sibling **home-api**. Esta guía
cubre solo el front: `environment.prod.ts`, build de `dist/`, imagen Docker
solo-`dist` y verificación SPA/PWA. Orquestación del servidor:
[`home-api/DEPLOY.md`](../home-api/DEPLOY.md).

| Componente | Imagen | Rol | Host |
|---|---|---|---|
| `home-front` | `registry.lumuscore.com/home/web:<git-sha>` | Solo `dist/` + Nginx mínimo in-container | `home.lumuscore.com` |
| `home-api` | `registry.lumuscore.com/home/api:<git-sha>` | Django + Daphne + Celery | `homeapi.lumuscore.com` |

## Local vs producción

| | Local | Producción |
|---|---|---|
| Dónde | Node/npm en este repo | imagen `home/web` en el stack de `home-api` |
| Front | `npm start` / `ng serve` | imagen solo-`dist` detrás de Traefik |
| API | `home-api` local (`docker-compose` / tools) | `https://homeapi.lumuscore.com` |
| Deploy | no aplica | `build:prod` → `deploy/build-image.sh` → deploy en home-api |

Desarrollo local: **no** hace falta Docker para trabajar el front.

Prerrequisito: infraestructura bootstrapada, DNS al servidor, login al registry,
y el stack `home` desplegable desde `home-api` (ver su `DEPLOY.md`).

---

## Arquitectura (dominios separados)

```text
https://home.lumuscore.com/              → este repo (SPA + PWA)
https://homeapi.lumuscore.com/api/       → home-api
https://homeapi.lumuscore.com/ws/        → home-api (WebSocket)
```

```text
Internet → :80/:443 Traefik (+ CrowdSec)
              ├─ Host(home.lumuscore.com)    → contenedor web:80
              └─ Host(homeapi.lumuscore.com) → contenedor api:8000
```

DNS:

```text
home.lumuscore.com         → IP del servidor
homeapi.lumuscore.com      → IP del servidor
registry.lumuscore.com     → IP del servidor   (ya de la infra)
```

En el Compose de `home-api` (`deploy/compose.production.yml`):

- Front: `Host(\`home.lumuscore.com\`)` vía `HOME_HOST`.
- Solo `expose` del contenedor `web` (puerto 80); Traefik enruta; no hay Nginx en el host.

---

## Artefactos en este repo

| Ruta | Uso |
|---|---|
| `Dockerfile` | Imagen del front **solo con `dist/`** |
| `deploy/build-image.sh` | Build/push `home/web`; sincroniza `WEB_VERSION` en `home-api/deploy/.env.deploy` |
| `deploy/nginx-spa.conf` | Nginx in-container: SPA fallback + headers PWA |
| `src/environments/environment.prod.example.ts` | Plantilla de URLs de producción |
| `.env.docker.example` | `FRONT_DIST_PATH` / registry / nombre de imagen |

El control plane del servidor (`compose.production.yml`, `deploy.sh`, `.env`,
backups) está en `home-api/deploy/`.

---

## 1. URLs de producción

`angular.json` sustituye `environment.ts` por `environment.prod.ts` en el build
de producción. Ese archivo es local e ignorado por Git. Créalo desde
`src/environments/environment.prod.example.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://homeapi.lumuscore.com/api',
  wsUrl: 'wss://homeapi.lumuscore.com/ws',
};
```

Si unificas API y front bajo un solo host (path routing), cambia a rutas
relativas y ajusta labels Traefik en `home-api`. El despliegue actual de
Lumuscore usa dominios separados.

---

## 2. Build de producción (host)

Angular se compila **en el host** (o CI). Docker solo empaqueta el directorio
configurable (`FRONT_DIST_PATH`, por defecto `dist/home-manager/browser`).

```bash
cd /ruta/a/home-front

cp -n src/environments/environment.prod.example.ts \
  src/environments/environment.prod.ts
# Revisar apiUrl / wsUrl absolutos al API de producción

npm ci
npm run build:prod
```

Artefacto por defecto:

```text
dist/home-manager/browser/
├── index.html
├── main-*.js
├── ngsw-worker.js
├── ngsw.json
├── manifest.webmanifest
└── …
```

---

## 3. Imagen Docker (solo empaquetar `dist`)

Copia `.env.docker.example` → `.env.docker` y ajusta si hace falta:

```dotenv
FRONT_DIST_PATH=dist/home-manager/browser
REGISTRY_HOST=registry.lumuscore.com
WEB_IMAGE=home/web
```

```bash
docker login registry.lumuscore.com

cp --update=none .env.docker.example .env.docker
./deploy/build-image.sh          # build
./deploy/build-image.sh --push   # build + push al registry
```

Tras el build, el script escribe `WEB_VERSION` en
`../home-api/deploy/.env.deploy` (mismo archivo que usa el API). Puedes
sobreescribir la ruta con `DEPLOY_DIR=/ruta/a/home-api/deploy`.

La imagen contiene Nginx alpine + el contenido de `FRONT_DIST_PATH` y la config
SPA/PWA en `deploy/nginx-spa.conf`.

Comprueba que la imagen no lleva Node ni el código fuente:

```bash
IMAGE="registry.lumuscore.com/home/web:$(git rev-parse --short HEAD)"
docker run --rm "$IMAGE" ls -la /usr/share/nginx/html | head
# Esperado: index.html, main-*.js, ngsw.json, … — no package.json ni src/
```

---

## 4. Publicar en el servidor

El pull/up del servicio `web` lo hace el stack de **home-api**:

1. Asegura `WEB_VERSION` en `home-api/deploy/.env.deploy` (lo hace
   `./deploy/build-image.sh` de este repo).
2. Sube control files si hace falta:
   `home-api/deploy/upload-to-server.sh --with-env-deploy`
3. En el servidor (`/opt/apps/home`): `./deploy.sh`

Detalle completo: [`home-api/DEPLOY.md`](../home-api/DEPLOY.md) §3.

Layout remoto relevante:

```text
/opt/apps/home/
  compose.production.yml   # incluye servicio web
  .env.deploy              # WEB_VERSION=…
  …
```

---

## 5. Puntos críticos SPA + PWA

1. Rutas del cliente deben devolver `index.html` (lo hace `deploy/nginx-spa.conf`).
2. `sw.js`, `ngsw-worker.js`, `ngsw.json` sin caché agresiva.
3. HTTPS (Traefik + Let's Encrypt).
4. `manifest.webmanifest` con `Content-Type: application/manifest+json`.

Más detalle de caché: [docs/PWA_CACHE_POLICY.md](docs/PWA_CACHE_POLICY.md).

---

## 6. Verificación post-deploy

```bash
curl -fsS -o /dev/null -w '%{http_code}\n' https://home.lumuscore.com/
curl -fsS -o /dev/null -w '%{http_code}\n' https://home.lumuscore.com/products
curl -I https://home.lumuscore.com/ngsw-worker.js | grep -i cache-control
```

En el servidor (desde `/opt/apps/home`, repo home-api):

```bash
docker compose --env-file .env --env-file .env.deploy -f compose.production.yml logs -f web
```

API / health: `home-api/DEPLOY.md`.

---

## 7. Rollback (front)

```bash
# En el servidor /opt/apps/home (control plane de home-api)
sed -i 's/^WEB_VERSION=.*/WEB_VERSION=SHA_ANTERIOR_WEB/' .env.deploy
./deploy.sh
```

Usa etiquetas inmutables (hash de commit). No dependas de `latest`.

---

## 8. Qué ya no aplica

| Antiguo | Nuevo |
|---|---|
| Nginx + conf en el host (`home-manager.conf`) | Traefik → contenedor `web` |
| Build Angular multietapa en Docker | Build en host + imagen solo-`dist` |
| Un solo host + PathPrefix | `HOME_HOST` (front) + `HOME_API_HOST` (API) |

---

## Checklist rápido

- [ ] `environment.prod.ts` con `apiUrl` / `wsUrl` absolutos al API
- [ ] `npm ci` + `npm run build:prod`
- [ ] `docker login` al registry privado
- [ ] `./deploy/build-image.sh --push` (actualiza `WEB_VERSION` en home-api)
- [ ] Deploy del stack vía `home-api` (`upload-to-server.sh` + `./deploy.sh`)
- [ ] SPA deep-link (`/products`, etc.) y service worker OK
- [ ] CORS del API permite `https://home.lumuscore.com`
- [ ] Rollback probado con un SHA anterior de `WEB_VERSION`

## Referencia rápida

| Comando | Uso |
|---|---|
| `npm start` | Dev server (sin service worker) |
| `npm run build:prod` | Build de producción con PWA |
| `./deploy/build-image.sh` | Empaqueta `dist/` en `home/web:<sha>`; sync `WEB_VERSION` → `home-api/deploy/.env.deploy` |
| `./deploy/build-image.sh --push` | Build + push |
