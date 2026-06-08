import { Routes } from '@angular/router';

export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: () => {
      const d = new Date();
      return `${d.getFullYear()}/${d.getMonth() + 1}`;
    },
    pathMatch: 'full',
  },
  {
    path: 'years',
    loadComponent: () => import('./finance-years.component').then((m) => m.FinanceYearsComponent),
  },
  {
    path: 'reports/history',
    loadComponent: () =>
      import('./reports-history.component').then((m) => m.FinanceReportsHistoryComponent),
  },
  {
    path: ':year/:month',
    loadComponent: () => import('./finance-dashboard.component').then((m) => m.FinanceDashboardComponent),
    children: [
      {
        path: '',
        redirectTo: 'initial-expenses',
        pathMatch: 'full',
      },
      {
        path: 'initial-expenses',
        loadComponent: () =>
          import('./initial-expenses.component').then((m) => m.InitialExpensesComponent),
      },
      {
        path: 'math',
        loadComponent: () =>
          import('./math-expenses.component').then((m) => m.MathExpensesComponent),
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./home-expenses.component').then((m) => m.HomeExpensesComponent),
      },
      {
        path: 'savings',
        loadComponent: () => import('./savings.component').then((m) => m.SavingsComponent),
      },
      {
        path: 'income',
        loadComponent: () => import('./income.component').then((m) => m.IncomeComponent),
      },
      {
        path: 'declaration',
        loadComponent: () =>
          import('./declaration.component').then((m) => m.DeclarationComponent),
      },
      {
        path: 'exchange-history',
        loadComponent: () =>
          import('./exchange-history.component').then((m) => m.FinanceExchangeHistoryComponent),
      },
      {
        path: 'reports',
        loadComponent: () => import('./reports.component').then((m) => m.FinanceReportsComponent),
      },
    ],
  },
];
