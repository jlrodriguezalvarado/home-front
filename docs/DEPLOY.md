# Deploy — Home Manager PWA (Angular + Nginx)

Guía para compilar y publicar el frontend Angular como PWA detrás de Nginx.

## Requisitos

| Componente | Versión mínima |
|---|---|
| Node.js | 20 LTS (recomendado) |
| npm | 10+ |
| Nginx | 1.18+ |
| Backend API | Django/REST en `/api/` (mismo origen o CORS configurado) |

La PWA usa `@angular/service-worker`. El service worker **solo funciona con HTTPS** (o `localhost` en desarrollo).

## 1. Configurar las URLs del API y WebSocket

`angular.json` reemplaza `environment.ts` por `environment.prod.ts` durante el
build de producción. Ese archivo es local y está ignorado por Git: no lo agregues
al repositorio. Si todavía no existe, créalo a partir de
`src/environments/environment.prod.example.ts` y ajusta ambas URLs:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://tu-dominio.com/api',
  wsUrl: 'wss://tu-dominio.com/ws',
};
```

`apiUrl` debe apuntar al endpoint base del backend **incluyendo** `/api`. La app también resuelve URLs de media quitando `/api` del origen (`resolveMediaUrl` en `src/app/core/api/api-url.ts`).

`wsUrl` debe usar `wss://` bajo HTTPS e incluir el prefijo `/ws`. Para frontend y
API bajo el mismo dominio puedes conservar las URLs relativas/dinámicas del ejemplo.

Antes de cada build confirma el archivo que realmente se sustituirá:

```bash
git check-ignore -v src/environments/environment.prod.ts
sed -n '1,80p' src/environments/environment.prod.ts
```

## 2. Build de producción

```bash
npm ci
npm run build:prod
```

Equivalente a `ng build --configuration production`.

### Artefacto generado

```
dist/home-manager/browser/
├── index.html
├── main-*.js
├── styles-*.css
├── chunk-*.js          # lazy routes
├── polyfills-*.js
├── manifest.webmanifest
├── sw.js               # push handlers + Angular service worker bootstrap
├── ngsw-worker.js      # Angular cache service worker
├── ngsw.json           # manifest del SW (generado en build)
├── safety-worker.js
├── worker-basic.min.js
├── icons/
└── favicon.ico
```

Copia el contenido de `dist/home-manager/browser/` al servidor web (no la carpeta `browser` en sí, sino su contenido).

## 3. Publicar archivos en el servidor

Ejemplo en Linux:

```bash
sudo mkdir -p /var/www/home-manager
sudo rsync -av --delete dist/home-manager/browser/ /var/www/home-manager/
sudo chown -R www-data:www-data /var/www/home-manager
```

En Windows, copia el mismo directorio a la ruta que Nginx usará como `root`.

## 4. Configuración de Nginx

Hay un ejemplo listo en [`deploy/nginx/home-manager.conf`](../deploy/nginx/home-manager.conf).

### Puntos críticos para una SPA Angular + PWA

1. **Rutas del cliente:** todas las rutas (`/products`, `/finance/2026/6`, etc.) deben devolver `index.html` para que Angular Router las maneje.
2. **Service workers sin caché:** `sw.js`, `ngsw-worker.js` y `ngsw.json` no deben cachearse en el navegador ni en proxies; si no, las actualizaciones de la app no se detectan.
3. **HTTPS:** obligatorio en producción para registro del service worker e instalación PWA.
4. **Manifest:** servir `manifest.webmanifest` con `Content-Type: application/manifest+json`.

### Escenario A — Frontend y API en el mismo dominio (recomendado)

```
https://home.example.com/        → Angular PWA
https://home.example.com/api/    → proxy al backend
https://home.example.com/media/  → proxy a archivos media del backend
```

Ventaja: sin problemas de CORS ni cookies cross-origin.

### Escenario B — API en otro dominio

Configura solo el bloque `location /` de Nginx y apunta `apiUrl` al dominio del backend. El backend debe permitir CORS desde el origen del frontend.

## 5. Activar el sitio en Nginx

```bash
sudo cp deploy/nginx/home-manager.conf /etc/nginx/sites-available/home-manager.conf
# Edita server_name, rutas SSL y upstream del API
sudo ln -s /etc/nginx/sites-available/home-manager.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```


```bash
  # Soporte para rutas Angular (SPA fallback)
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache de assets estáticos versionados
  location ~* \.(?:css|js|jpg|jpeg|gif|png|svg|ico|webp|woff2?)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
  }

  location ~* (manifest\.webmanifest)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }

  location /icons/ {
    add_header Cache-Control "public, max-age=86400, must-revalidate";
  }

  location ~* ^/(sw\.js|ngsw-worker\.js|ngsw\.json|safety-worker\.js)$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    try_files $uri =404;
  }
```

## 6. HTTPS con Let's Encrypt (opcional)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d home.example.com
```

Certbot añade el bloque `listen 443 ssl` y la redirección HTTP → HTTPS.

## 7. Comportamiento PWA en producción

| Archivo | Rol |
|---|---|
| `ngsw-config.json` | Config de caché en build (prefetch de JS/CSS, lazy de imágenes) |
| `sw.js` | Service worker registrado; maneja push e importa `ngsw-worker.js` |
| `ngsw-worker.js` | Service worker de caché generado por Angular |
| `manifest.webmanifest` | Metadatos de instalación (nombre, iconos, `display: standalone`) |
| `app.config.ts` | Registra el SW solo fuera de dev (`enabled: !isDevMode()`) |

Tras un nuevo deploy:

1. Nginx sirve el nuevo `ngsw.json`.
2. El service worker detecta el cambio en la siguiente visita.
3. La app muestra la actualización según la estrategia de Angular (`registerWhenStable:30000`).

Para forzar limpieza en un cliente: DevTools → Application → Clear storage, o desinstalar la PWA y volver a instalar.

## 8. Verificación post-deploy

```bash
# SPA responde
curl -I https://home.example.com/

# Ruta profunda devuelve index.html (no 404)
curl -I https://home.example.com/products

# Service worker sin caché agresiva
curl -I https://home.example.com/ngsw-worker.js
curl -I https://home.example.com/ngsw.json

# API accesible (si hay proxy)
curl -I https://home.example.com/api/
```

En el navegador:

1. Abre DevTools → **Application** → **Service Workers** y confirma que está activo.
2. En **Manifest**, revisa nombre, iconos y `start_url`.
3. En móvil o Chrome desktop: menú → **Instalar aplicación**.

## 9. Actualizar una versión ya desplegada

```bash
git pull
npm ci
# Revisa environment.prod.ts (local e ignorado)
npm run build:prod
sudo rsync -av --delete dist/home-manager/browser/ /var/www/home-manager/
sudo systemctl reload nginx   # opcional; los estáticos ya están actualizados
```

No hace falta reiniciar Nginx salvo que hayas cambiado la configuración.

## 10. Troubleshooting

| Síntoma | Causa probable | Solución |
|---|---|---|
| 404 al recargar `/products` | Falta `try_files` SPA | Añadir `try_files $uri $uri/ /index.html` |
| PWA no se instala | Sin HTTPS | Activar TLS |
| App no actualiza tras deploy | `ngsw.json` cacheado | Headers `Cache-Control: no-cache` en SW y `ngsw.json` |
| API falla con CORS | API en otro origen | Proxy `/api/` en Nginx o CORS en backend |
| Imágenes rotas | `apiUrl` incorrecto | `apiUrl` debe terminar en `/api`; media sale del origen sin `/api` |
| SW no se registra | Build en modo dev o HTTP | Usar `build:prod` y HTTPS |

## Referencia rápida de scripts

| Comando | Uso |
|---|---|
| `npm start` | Dev server en puerto 4300 (sin service worker) |
| `npm run build` | Build por defecto (production) |
| `npm run build:prod` | Build explícito de producción con PWA |
