import { Routes } from '@angular/router';
export const PRICE_COMPARISONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./price-comparison-dashboard.component').then((module) => module.PriceComparisonDashboardComponent),
  },
];
