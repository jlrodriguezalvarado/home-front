# Tipos OpenAPI

Los tipos generados viven en `src/app/core/api/generated/` y no sustituyen los
repositories ni los modelos de dominio. Se usan como frontera verificable mientras
la adopción continúa por feature.

Desde los repositorios hermanos `home-api` y `home-front`:

1. Exportar y validar el schema:

   ```bash
   cd ../home-api
   docker compose exec -T home_api_app \
     python manage.py spectacular --validate --file docs/openapi.yaml
   ```

2. Regenerar tipos:

   ```bash
   cd ../home-front
   npm run api:types
   ```

3. Verificar que el archivo versionado esté actualizado:

   ```bash
   npm run api:types:check
   ```

Los DTO generados deben mapearse hacia modelos propios de cada feature. No deben
importarse directamente desde templates o componentes de UI.
