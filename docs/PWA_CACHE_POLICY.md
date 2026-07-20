# Política de caché PWA

- El service worker precachea únicamente el shell compilado y assets estáticos.
- No existen `dataGroups`: respuestas de `/api/`, incluidas finanzas, chat y datos
  autenticados, no se almacenan para uso offline.
- `/api/**`, `/media/**` y `/health/**` están excluidos explícitamente de navegación,
  evitando que una petición de datos reciba accidentalmente `index.html`.
- Las mutaciones nunca se cachean.
- El logout limpia tokens y almacenamiento local propio del usuario. No elimina el
  asset cache compartido porque este no contiene datos de sesión.
- La aplicación registra conectividad, omite checks mientras está offline y vuelve a
  comprobar versiones al recuperar conexión o visibilidad.
- No se presenta información financiera como disponible offline. Una futura caché de
  datos deberá incluir cifrado, partición por usuario, caducidad y migración de formato.
