import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService, AppStringKey } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold">{{ t('dashboard') }}</h1>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="p-6 bg-white dark:bg-dark-surface rounded-2xl shadow-sm border dark:border-gray-800">
          <h2 class="text-xl font-bold mb-2">{{ t('products') }}</h2>
          <p class="text-gray-500">Manage your product list</p>
        </div>
        <div class="p-6 bg-white dark:bg-dark-surface rounded-2xl shadow-sm border dark:border-gray-800">
          <h2 class="text-xl font-bold mb-2">{{ t('shoppingCart') }}</h2>
          <p class="text-gray-500">Check your current cart</p>
        </div>
        <div class="p-6 bg-white dark:bg-dark-surface rounded-2xl shadow-sm border dark:border-gray-800">
          <h2 class="text-xl font-bold mb-2">{{ t('finance') }}</h2>
          <p class="text-gray-500">Monthly financial overview</p>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {
  i18n = inject(I18nService);
  t(key: AppStringKey) { return this.i18n.t(key); }
}
