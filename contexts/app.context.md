# Home Manager Frontend — Contexto del proyecto

## Qué es

Frontend web de **Home Manager** (`home-manager`), réplica del app Flutter. Gestión doméstica: compras multi-comercio, finanzas mensuales, divisas, tipo de cambio, herramienta Mosaic (Instagram grid). Backend REST Django en `http://localhost:8000/api` (configurable en `src/environments/environment.ts`).

## Stack

- **Angular 19+**: standalone components, lazy routes, signals, `inject()`, functional guards/interceptors
- **RxJS 7** para HTTP/async
- **Tailwind CSS 3** + tokens Material Design 3 vía CSS variables (`--md-*`)
- **decimal.js** para precisión financiera
- **jszip** para Mosaic
- **PWA** con `@angular/service-worker` (prod)
- Fuente: Plus Jakarta Sans + Material Symbols Outlined
- Puerto dev: `4300` (`npm start`)

## Estructura de carpetas

```
src/app/
├── app.routes.ts          # Rutas raíz
├── app.config.ts          # Providers (router, http, interceptor, cart init, SW)
├── app.component.ts       # Root: router-outlet + toast + confirm dialog
├── core/
│   ├── api/               # ApiService, endpoints, auth.interceptor, api-url, models compartidos
│   ├── auth/              # AuthService (JWT access/refresh en localStorage)
│   ├── i18n/              # I18nService (en/es, APP_STRINGS)
│   ├── layout/            # AppShellComponent (sidebar, topbar, bottom nav mobile)
│   ├── models/            # shopping.models.ts (Product, CartItem)
│   └── theme/             # ThemeService (dark mode class en <html>)
├── features/              # Un folder por dominio
│   ├── auth/              # login, splash
│   ├── dashboard/
│   ├── commerce/          # commerce.repository.ts + commerce-list
│   ├── products/          # product.repository, product.mapper, product-list
│   ├── shopping/          # cart, purchases, utils (price, presentation-unit)
│   ├── currency/
│   ├── exchange/
│   ├── finance/           # módulo más grande (sub-rutas, CRUD mensual)
│   └── mosaic/
└── shared/
    ├── components/        # loading-state, empty-state, error-state, quantity-editor, toast, confirm
    ├── directives/        # dialog-form.directive
    ├── guards/            # authGuard, publicGuard
    └── services/          # toast.service, confirm.service
```

## Patrones arquitectónicos

Patrones obligatorios para módulos nuevos.

### 1. Feature module = carpeta en `features/<nombre>/`

Cada feature típicamente tiene:

- `*.repository.ts` — acceso HTTP, mapeo API → modelos frontend
- `*-list.component.ts/html/scss` — pantalla principal
- `utils/` o `services/` si hay lógica de dominio
- Modelos en `core/api/models.ts` (globales) o `features/<x>/models/` (dominio específico)

### 2. Repository pattern

```typescript
@Injectable({ providedIn: 'root' })
export class XRepository {
  private readonly api = inject(ApiService);
  list(): Observable<X[]> {
    return this.api.get<any[] | PaginatedResponse<any>>(API_ENDPOINTS.x.list).pipe(
      map(res => {
        const items = Array.isArray(res) ? res : (res.results ?? []);
        return items.map(item => ({ /* mapeo snake_case API → camelCase */ }));
      }),
    );
  }
}
```

- Usar `ApiService` (get/post/patch/delete) + `API_ENDPOINTS` en `core/api/endpoints.ts`
- URLs con `apiUrl()` helper (evita duplicar `/api/`)
- Imágenes con `resolveMediaUrl()` (soporta `public_image` o `/media/{path}`)
- Respuestas paginadas: `{ count, next, previous, results }`
- API a veces devuelve array plano o paginado — manejar ambos

### 3. Componentes standalone

```typescript
@Component({
  selector: 'app-x-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingStateComponent, ...],
  templateUrl: './x-list.component.html',
  styleUrl: './x-list.component.scss',
})
export class XListComponent implements OnInit {
  repo = inject(XRepository);
  i18n = inject(I18nService);
  items = signal<X[]>([]);
  loading = signal(false);
  error = signal(false);
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.error.set(false);
    this.repo.list().subscribe({
      next: (res) => { this.items.set(res); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set(true); },
    });
  }
  t(key: AppStringKey) { return this.i18n.t(key); }
}
```

Estados UI: `loading` / `error` / `empty` con componentes shared.

### 4. Rutas

Registrar en `app.routes.ts` dentro de `AppShellComponent` children (protegidas por `authGuard`):

```typescript
{
  path: 'mi-modulo',
  loadComponent: () => import('./features/mi-modulo/mi-list.component').then(m => m.MiListComponent),
}
```

Para sub-módulos complejos (como finance): `loadChildren` + archivo `*.routes.ts`.

Rutas públicas: `/login` (publicGuard), `/splash`.

### 5. Auth

- `AuthService`: login → tokens en localStorage; `isAuthenticated` computed signal
- `authInterceptor`: añade `Authorization: Bearer`, refresh en 401, redirect a `/login`
- Endpoints: `POST /auth/login`, `POST /auth/refresh`, `GET /authme/`

### 6. i18n

- `I18nService` con `lang()` signal (`en` | `es`), `t(key)`, `setLang()`
- Agregar keys en `APP_STRINGS` + traducciones EN/ES en `i18n.service.ts`
- Patrón: `t(key: AppStringKey)` en componentes

### 7. UI / estilos

- Tailwind utility classes con tokens: `bg-surface`, `text-on-surface`, `border-outline-variant`, `text-primary`, etc.
- Clases globales en `styles.scss`: `.page-title`, `.nav-item-active`, `.nav-item-inactive`, `.glass`
- Iconos: `<span class="material-symbols-outlined">icon_name</span>`
- Mobile-first: bottom nav (4 items), drawer lateral; desktop sidebar 256px
- Dark mode: `ThemeService` toggle, clase `dark` en `<html>`

### 8. Servicios shared

- `ToastService`: `success()`, `error()`, `info()` — contenedor en app root
- `ConfirmService`: `confirm(message, { variant, confirmLabel })` → Promise<boolean>
- `DialogFormDirective`: formularios en modal

### 9. Formato de código

- Sin líneas en blanco entre declaraciones consecutivas del mismo bloque
- Comentarios en inglés
- Preferir signals sobre BehaviorSubject para estado local
- `inject()` sobre constructor injection

## Módulos existentes y rutas

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | DashboardComponent | Resumen carrito + compras recientes |
| `/login` | LoginComponent | JWT login |
| `/products` | ProductListComponent | Búsqueda, filtros comercio/categoría, paginación, add to cart |
| `/cart` | CartComponent | Carrito multi-comercio, persistido localStorage |
| `/purchases` | PurchaseHistoryComponent | Historial compras |
| `/purchases/detail` | PurchaseDetailComponent | Detalle + reutilizar pedido |
| `/commerces` | CommerceListComponent | Lista comercios/tiendas |
| `/currencies` | CurrencyListComponent | CRUD divisas |
| `/exchange` | ExchangeDashboardComponent | Calculadora tipo cambio |
| `/finance/*` | Finance module | Finanzas mensuales (ver abajo) |
| `/mosaic` | MosaicComponent | Generador grid Instagram + ZIP |

## Finance (módulo de referencia para CRUD complejo)

- Rutas: `/finance/:year/:month/{initial-expenses|math|home|savings|income|declaration|exchange-history|reports}`
- También: `/finance/years`, `/finance/reports`, `/finance/income-accounts`, `/finance/savings-account-types`
- `FinanceRepository`: CRUD genérico por feature + month summary
- `FinanceListBaseComponent`: base reutilizable con dialog CRUD, validación (`finance-form-rules.ts`), refresh vía `FinanceRefreshService`
- Montos como **strings** (precisión), formateo con `formatFinanceMoney` + decimal.js
- Query params API: `year`, `month`, `perPage`

## Shopping (referencia para estado cliente)

- `CartService`: signals, agrupado por commerceId, persistencia `CartStorageService`
- `ProductMapper`: normaliza respuestas API heterogéneas (snake_case, nested commerce)
- Utils: `price.utils.ts`, `presentation-unit.utils.ts` (kg vs unidad)

## API endpoints centralizados

Definidos en `core/api/endpoints.ts`. Principales grupos:

- `/products/`, `/product-categories`, `/commerces/`
- `/purchases/`
- `/currencies`, `/exchange-rates/`
- `/finance/*` (month-summary, items por tipo, reports, expense-spend, exchange-calculator, etc.)

Al crear módulo nuevo: **agregar endpoints aquí primero**.

## Modelos compartidos

En `core/api/models.ts`:

- `PaginatedResponse<T>`, `Commerce`, `Category`, `Currency`
- `Product`, `CartItem` → re-export desde `shopping.models`

## Cómo crear un módulo nuevo (checklist)

1. Definir interfaces en `models.ts` o `features/<x>/models/`
2. Agregar `API_ENDPOINTS.<x>` en `endpoints.ts`
3. Crear `<x>.repository.ts` con mapeo API
4. Crear `<x>-list.component.ts/html/scss` (signals + loading/error/empty)
5. Registrar ruta lazy en `app.routes.ts`
6. Agregar nav item en `AppShellComponent.navItems` si aplica
7. Agregar strings i18n en `i18n.service.ts`
8. Usar Tailwind tokens existentes, no colores hardcodeados

## Backend asumido

- Django REST, JWT auth
- Paginación estilo DRF
- Campos API en snake_case; frontend usa camelCase tras mapeo
- Imágenes: campo `public_image` (URL firmada) o path relativo → `/media/`
- Montos financieros como strings decimales

## Testing

- Karma/Jasmine: `npm test`
- Specs junto a repos/utils críticos (finance, cart, guards)

## Deploy

- `ng build --configuration production`
- Nginx config en `deploy/nginx/home-manager.conf`
- Docs: `docs/DEPLOY.md`
