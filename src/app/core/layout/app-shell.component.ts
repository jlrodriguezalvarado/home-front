import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { I18nService, AppStringKey } from '../i18n/i18n.service';
import { ThemeService } from '../theme/theme.service';
import { AuthService } from '../auth/auth.service';

interface NavItem {
  path: string;
  label: AppStringKey;
  icon: string;
}

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  i18n = inject(I18nService);
  theme = inject(ThemeService);
  auth = inject(AuthService);
  router = inject(Router);

  drawerOpen = signal(false);

  navItems: NavItem[] = [
    { path: '/', label: 'home', icon: 'home' },
    { path: '/products', label: 'products', icon: 'inventory_2' },
    { path: '/cart', label: 'cart', icon: 'shopping_cart' },
    { path: '/purchases', label: 'orders', icon: 'receipt_long' },
    { path: '/commerces', label: 'stores', icon: 'storefront' },
    { path: '/currencies', label: 'currencies', icon: 'payments' },
    { path: '/meal-planning', label: 'mealPlanning', icon: 'restaurant_menu' },
    { path: '/finance', label: 'finances', icon: 'account_balance_wallet' },
    { path: '/mosaic', label: 'instagramTool', icon: 'grid_view' },
  ];

  mobileNavItems: NavItem[] = [
    { path: '/', label: 'home', icon: 'home' },
    { path: '/products', label: 'products', icon: 'inventory_2' },
    { path: '/cart', label: 'cart', icon: 'shopping_cart' },
    { path: '/purchases', label: 'orders', icon: 'receipt_long' },
  ];

  t(key: AppStringKey) {
    return this.i18n.t(key);
  }

  toggleLang() {
    this.i18n.setLang(this.i18n.lang() === 'en' ? 'es' : 'en');
  }

  toggleDrawer() {
    this.drawerOpen.update(v => !v);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
  }

  isActive(path: string): boolean {
    const url = this.router.url.split('?')[0];
    if (path === '/') return url === '/';
    return url.startsWith(path);
  }

  logout() {
    this.closeDrawer();
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
