# Home Manager Frontend (Angular)

Production-ready web frontend for Home Manager, replicating Flutter app functionality.

## Stack
- Angular 19+ (Standalone Components, Signals, Router, HttpClient)
- Tailwind CSS
- decimal.js for financial accuracy
- jszip for Mosaic tool

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API:**
   Edit `src/environments/environment.ts` or `src/environments/environment.development.ts` to set `API_BASE_URL`.
   Default: `http://localhost:8000/api/`

3. **Run development server:**
   ```bash
   npm start
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

## Key Features Parity
- **Auth:** Login, token refresh (JWT), protected routes.
- **Shopping:** Product search, multi-commerce cart, purchase history, "Use" previous order.
- **Finance:** Monthly summaries, CRUD for initial expenses, math, home, savings, income, and declaration.
- **Exchange:** Live calculator, save exchange, monthly history.
- **Mosaic:** Client-side 3x3/3x2/etc grid generator with ZIP download.

## Implemented Routes vs Flutter
| Route | Angular Component | Status |
|---|---|---|
| `/` | `DashboardComponent` | Done |
| `/login` | `LoginComponent` | Done |
| `/products` | `ProductListComponent` | Done |
| `/cart` | `CartComponent` | Done |
| `/purchases` | `PurchaseHistoryComponent`| Done |
| `/purchases/detail` | `PurchaseDetailComponent` | Done |
| `/currencies` | `CurrencyListComponent` | Done |
| `/exchange` | `ExchangeDashboardComponent`| Done |
| `/finance/:y/:m` | `FinanceDashboardComponent`| Done |
| `/finance/:y/:m/initial-expenses` | `InitialExpensesComponent`| Done |
| `/finance/:y/:m/math` | `MathExpensesComponent` | Done |
| `/finance/:y/:m/home` | `HomeExpensesComponent` | Done |
| `/finance/:y/:m/savings` | `SavingsComponent` | Done |
| `/finance/:y/:m/income` | `IncomeComponent` | Done |
| `/finance/:y/:m/declaration` | `DeclarationComponent` | Done |
| `/finance/:y/:m/reports` | `FinanceReportsComponent` | Done |
| `/mosaic` | `MosaicComponent` | Done |

## Assumed API Endpoints
- `POST /api/products/update-prices/` (Receives `product_ids`, returns updated products)
- `POST /api/finance/reports/generate/` (Starts report generation)
- `GET /api/finance/reports/` (Lists generated reports for a month)
- `DELETE /api/currencies/<code>/` (Standard DELETE for CRUD)
- Standard CRUD endpoints for `/api/finance/<feature>/` with `year`/`month` query params.
