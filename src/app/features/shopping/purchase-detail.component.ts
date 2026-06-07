import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Purchase } from './purchase.repository';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-purchase-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6" *ngIf="purchase">
      <div class="flex items-center gap-4">
        <button (click)="back()" class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">←</button>
        <h1 class="text-3xl font-bold">{{ purchase.commerceName }}</h1>
      </div>

      <div class="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border dark:border-gray-800 overflow-hidden">
        <div class="p-6 border-b dark:border-gray-800 flex justify-between items-center">
          <div>
            <div class="text-sm text-gray-500">Date</div>
            <div class="font-bold">{{ purchase.date | date:'medium' }}</div>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-500">Total</div>
            <div class="text-2xl font-bold text-primary">{{ purchase.total }}</div>
          </div>
        </div>

        <div class="divide-y dark:divide-gray-800">
          <div *ngFor="let item of purchase.items" class="p-6 flex justify-between items-center">
            <div>
              <div class="font-medium">{{ item.product.name }}</div>
              <div class="text-sm text-gray-500">{{ item.quantity }} {{ item.product.unit }} x {{ item.price }}</div>
            </div>
            <div class="font-bold">
               {{ (item.quantity * item.price).toFixed(2) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PurchaseDetailComponent {
  router = inject(Router);
  i18n = inject(I18nService);
  purchase: Purchase | null = null;

  constructor() {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.purchase = navigation.extras.state['purchase'];
    }
  }

  back() {
    this.router.navigate(['/purchases']);
  }
}
