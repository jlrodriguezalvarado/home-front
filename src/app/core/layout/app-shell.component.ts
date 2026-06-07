import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { I18nService, AppStringKey } from '../i18n/i18n.service';
import { ThemeService } from '../theme/theme.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-light-scaffold dark:bg-dark-scaffold">
      <!-- Sidebar Desktop -->
      <aside class="hidden md:flex flex-col w-64 bg-white dark:bg-dark-surface border-r dark:border-gray-800">
        <div class="p-6 text-2xl font-bold text-primary">Home Manager</div>

        <nav class="flex-1 px-4 space-y-1">
          <ng-container *ngFor="let item of navItems">
            <a [routerLink]="item.path"
               routerLinkActive="bg-primary/10 text-primary"
               [routerLinkActiveOptions]="{exact: item.path === '/'}"
               class="flex items-center px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <span>{{ t(item.label) }}</span>
            </a>
          </ng-container>
        </nav>

        <div class="p-4 border-t dark:border-gray-800 space-y-2">
          <button (click)="toggleLang()" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            {{ t('language') }}: {{ i18n.lang() | uppercase }}
          </button>
          <button (click)="theme.toggleTheme()" class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            {{ t('darkMode') }}: {{ theme.isDark() ? 'ON' : 'OFF' }}
          </button>
          <button (click)="logout()" class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
            {{ t('logout') }}
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- Topbar Mobile -->
        <header class="md:hidden flex items-center justify-between p-4 bg-white dark:bg-dark-surface border-b dark:border-gray-800">
          <span class="text-xl font-bold text-primary">Home Manager</span>
          <button (click)="logout()" class="text-red-500 text-sm font-medium">{{ t('logout') }}</button>
        </header>

        <div class="flex-1 overflow-auto p-4 md:p-8">
          <router-outlet></router-outlet>
        </div>

        <!-- Bottom Nav Mobile -->
        <nav class="md:hidden flex bg-white dark:bg-dark-surface border-t dark:border-gray-800">
          <a *ngFor="let item of mobileNavItems"
             [routerLink]="item.path"
             routerLinkActive="text-primary"
             [routerLinkActiveOptions]="{exact: item.path === '/'}"
             class="flex-1 flex flex-col items-center py-2 text-[10px]">
            <span>{{ t(item.label) }}</span>
          </a>
        </nav>
      </main>
    </div>
  `
})
export class AppShellComponent {
  i18n = inject(I18nService);
  theme = inject(ThemeService);
  auth = inject(AuthService);
  router = inject(Router);

  navItems: {path: string, label: AppStringKey}[] = [
    { path: '/', label: 'dashboard' },
    { path: '/commerces', label: 'commerces' },
    { path: '/products', label: 'products' },
    { path: '/currencies', label: 'currencies' },
    { path: '/exchange', label: 'exchangeRates' },
    { path: '/cart', label: 'shoppingCart' },
    { path: '/purchases', label: 'purchaseHistory' },
    { path: '/mosaic', label: 'mosaicGrid' },
  ];

  mobileNavItems: {path: string, label: AppStringKey}[] = [
    { path: '/', label: 'dashboard' },
    { path: '/products', label: 'products' },
    { path: '/cart', label: 'shoppingCart' },
    { path: '/purchases', label: 'purchaseHistory' },
  ];

  t(key: AppStringKey) {
    return this.i18n.t(key);
  }

  toggleLang() {
    this.i18n.setLang(this.i18n.lang() === 'en' ? 'es' : 'en');
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
