import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
    canActivate: [publicGuard]
  },
  {
    path: 'splash',
    loadComponent: () => import('./features/auth/splash.component').then(m => m.SplashComponent)
  },
  {
    path: '',
    loadComponent: () => import('./core/layout/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'commerces',
        loadComponent: () => import('./features/commerce/commerce-list.component').then(m => m.CommerceListComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/product-list.component').then(m => m.ProductListComponent)
      },
      {
        path: 'cart',
        loadComponent: () => import('./features/shopping/cart.component').then(m => m.CartComponent)
      },
      {
        path: 'purchases',
        loadComponent: () => import('./features/shopping/purchase-history.component').then(m => m.PurchaseHistoryComponent)
      },
      {
        path: 'purchases/detail',
        loadComponent: () => import('./features/shopping/purchase-detail.component').then(m => m.PurchaseDetailComponent)
      },
      {
        path: 'currencies',
        loadComponent: () => import('./features/currency/currency-list.component').then(m => m.CurrencyListComponent)
      },
      {
        path: 'exchange',
        loadComponent: () => import('./features/exchange/exchange-dashboard.component').then(m => m.ExchangeDashboardComponent)
      },
      {
        path: 'meal-planning',
        loadChildren: () => import('./features/meal-planning/meal-planning.routes').then(m => m.MEAL_PLANNING_ROUTES),
      },
      {
        path: 'finance',
        loadChildren: () => import('./features/finance/finance.routes').then(m => m.FINANCE_ROUTES)
      },
      {
        path: 'mosaic',
        loadComponent: () => import('./features/mosaic/mosaic.component').then(m => m.MosaicComponent)
      },
      {
        path: 'chat',
        loadChildren: () => import('./features/chat/chat.routes').then(m => m.CHAT_ROUTES),
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
