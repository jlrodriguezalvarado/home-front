import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from './cart.service';
import { PurchaseRepository } from './purchase.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 pb-20 md:pb-0">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold">{{ i18n.t('shoppingCart') }}</h1>
        <div class="flex gap-2" *ngIf="cart.items().length > 0">
           <button (click)="cart.updatePrices()" class="px-4 py-2 bg-secondary text-white rounded-lg text-sm font-bold">
             Update Prices
           </button>
           <select [(ngModel)]="filterCommerce" class="px-4 py-2 rounded-lg border dark:border-gray-800 bg-white dark:bg-dark-surface text-sm">
             <option value="">All Commerces</option>
             <option *ngFor="let group of cart.totalByCommerce()" [value]="group.commerceName">{{ group.commerceName }}</option>
           </select>
        </div>
      </div>

      <div *ngIf="cart.items().length === 0" class="flex flex-col items-center justify-center py-20 text-gray-500">
        <div class="text-6xl mb-4">🛒</div>
        <p>Your cart is empty</p>
      </div>

      <div *ngFor="let group of filteredGroups()" class="bg-white dark:bg-dark-surface rounded-2xl shadow-sm border dark:border-gray-800 overflow-hidden">
        <div class="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 border-b dark:border-gray-800 flex justify-between items-center">
          <span class="font-bold">{{ group.commerceName }}</span>
          <span class="text-primary font-bold">{{ group.subtotal }}</span>
        </div>
        <div class="divide-y dark:divide-gray-800">
          <div *ngFor="let item of group.items" class="p-6 flex items-center gap-4">
            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              <img *ngIf="item.product.image" [src]="item.product.image" class="w-full h-full object-cover">
            </div>
            <div class="flex-1">
              <div class="font-medium">{{ item.product.name }}</div>
              <div class="text-sm text-gray-500">
                {{ item.product.price }} / {{ item.product.unit }}
                <span class="ml-2 text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{{ item.product.unit === 'kg' ? 'WEIGHT' : 'UNIT' }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button (click)="updateQty(item.product.id, item.quantity, -1)" class="w-8 h-8 rounded-full border dark:border-gray-700 flex items-center justify-center">-</button>
              <input type="text" [(ngModel)]="item.quantity" (change)="cart.updateQuantity(item.product.id, item.quantity)"
                     class="w-12 text-center bg-transparent border-b dark:border-gray-700">
              <button (click)="updateQty(item.product.id, item.quantity, 1)" class="w-8 h-8 rounded-full border dark:border-gray-700 flex items-center justify-center">+</button>
            </div>
            <button (click)="cart.removeFromCart(item.product.id)" class="text-red-500 ml-4">×</button>
          </div>
        </div>
        <div class="p-4 bg-gray-50 dark:bg-gray-800/30 flex flex-wrap gap-2">
          <button (click)="copyMessage(group)" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-bold">
            Copy
          </button>
          <button (click)="sendWhatsApp(group)" class="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold">
            WhatsApp
          </button>
          <button (click)="confirmPurchase(group)" class="flex-1 bg-primary text-white py-2 rounded-lg font-bold hover:bg-secondary">
            {{ i18n.t('confirmPurchase') }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class CartComponent {
  cart = inject(CartService);
  i18n = inject(I18nService);
  filterCommerce = '';
  purchaseRepo = inject(PurchaseRepository);
  router = inject(Router);

  filteredGroups() {
    const groups = this.cart.totalByCommerce();
    if (!this.filterCommerce) return groups;
    return groups.filter((g) => g.commerceName === this.filterCommerce);
  }

  updateQty(id: string, current: string, delta: number) {
    const step = 1; // Could be 0.1 for kg if needed
    const next = Math.max(0, parseFloat(current) + delta * step).toString();
    this.cart.updateQuantity(id, next);
  }

  confirmPurchase(group: any) {
    if (!confirm(this.i18n.t('confirmPurchase') + '?')) return;

    const data = {
      commerce: group.items[0].product.commerce.id,
      items: group.items.map((i: any) => ({
        product: i.product.id,
        quantity: i.quantity,
        price: i.product.price
      }))
    };

    this.purchaseRepo.create(data).subscribe({
      next: () => {
        group.items.forEach((i: any) => this.cart.removeFromCart(i.product.id));
        this.router.navigate(['/purchases']);
      },
      error: (err) => alert('Error creating purchase'),
    });
  }

  private formatMessage(group: any): string {
    let msg = `*${group.commerceName}*\n\n`;
    group.items.forEach((item: any) => {
      msg += `- ${item.product.name}: ${item.quantity} ${item.product.unit} x ${item.product.price}\n`;
    });
    msg += `\n*Total: ${group.subtotal}*`;
    return msg;
  }

  copyMessage(group: any) {
    const msg = this.formatMessage(group);
    navigator.clipboard.writeText(msg).then(() => alert('Message copied to clipboard'));
  }

  sendWhatsApp(group: any) {
    const msg = encodeURIComponent(this.formatMessage(group));
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }
}
