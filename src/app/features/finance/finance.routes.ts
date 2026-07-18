import { Routes } from '@angular/router';
import { financeDefaultRoute } from './finance-period.storage';

export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: financeDefaultRoute,
    pathMatch: 'full',
  },
  {
    path: 'years',
    loadComponent: () =>
      import('./finance-years/finance-years.component').then((m) => m.FinanceYearsComponent),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./financial-reports/financial-reports.component').then((m) => m.FinancialReportsComponent),
  },
  {
    path: 'reports/history',
    redirectTo: 'reports',
    pathMatch: 'full',
  },
  {
    path: 'income-accounts',
    loadComponent: () =>
      import('./income-account-list/income-account-list.component').then((m) => m.IncomeAccountListComponent),
  },
  {
    path: 'income-accounts/new',
    loadComponent: () =>
      import('./income-account-form/income-account-form.component').then((m) => m.IncomeAccountFormComponent),
  },
  {
    path: 'income-accounts/:id/edit',
    loadComponent: () =>
      import('./income-account-form/income-account-form.component').then((m) => m.IncomeAccountFormComponent),
  },
  {
    path: 'savings-account-types',
    loadComponent: () =>
      import('./savings-account-type-list/savings-account-type-list.component').then(
        (m) => m.SavingsAccountTypeListComponent,
      ),
  },
  {
    path: 'savings-account-types/new',
    loadComponent: () =>
      import('./savings-account-type-form/savings-account-type-form.component').then(
        (m) => m.SavingsAccountTypeFormComponent,
      ),
  },
  {
    path: 'savings-account-types/:id/edit',
    loadComponent: () =>
      import('./savings-account-type-form/savings-account-type-form.component').then(
        (m) => m.SavingsAccountTypeFormComponent,
      ),
  },
  {
    path: ':year/:month',
    loadComponent: () =>
      import('./finance-dashboard/finance-dashboard.component').then((m) => m.FinanceDashboardComponent),
    children: [
      {
        path: '',
        redirectTo: 'initial-expenses',
        pathMatch: 'full',
      },
      {
        path: 'initial-expenses',
        loadComponent: () =>
          import('./finance-dashboard/components/initial-expenses/initial-expenses.component').then(
            (m) => m.InitialExpensesComponent,
          ),
      },
      {
        path: 'initial-expenses/initial-expense-categories',
        loadComponent: () =>
          import(
            './finance-dashboard/components/initial-expense-categories/initial-expense-categories.component'
          ).then((m) => m.InitialExpenseCategoriesComponent),
      },
      {
        path: 'math',
        loadComponent: () =>
          import('./finance-dashboard/components/math-expenses/math-expenses.component').then(
            (m) => m.MathExpensesComponent,
          ),
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./finance-dashboard/components/home-expenses/home-expenses.component').then(
            (m) => m.HomeExpensesComponent,
          ),
      },
      {
        path: 'savings',
        loadComponent: () =>
          import('./finance-dashboard/components/savings/savings.component').then((m) => m.SavingsComponent),
      },
      {
        path: 'income',
        loadComponent: () =>
          import('./finance-dashboard/components/income/income.component').then((m) => m.IncomeComponent),
      },
      {
        path: 'declaration',
        loadComponent: () =>
          import('./finance-dashboard/components/declaration/declaration.component').then(
            (m) => m.DeclarationComponent,
          ),
      },
      {
        path: 'exchange-history',
        loadComponent: () =>
          import('./finance-dashboard/components/exchange-history/exchange-history.component').then(
            (m) => m.FinanceExchangeHistoryComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./finance-dashboard/components/reports/reports.component').then(
            (m) => m.FinanceReportsComponent,
          ),
      },
    ],
  },
];
