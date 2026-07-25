import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';

import { CommonModule } from '@angular/common';

import { RouterLink } from '@angular/router';

import { forkJoin } from 'rxjs';

import { I18nService, AppStringKey } from '../../core/i18n/i18n.service';

import { CartService } from '../shopping/cart.service';

import {
  PurchaseRepository,
  Purchase,
  enrichPurchaseCommerceNames,
} from '../shopping/purchase.repository';
import { CommerceRepository } from '../commerce/commerce.repository';
import { formatPrice, singleAggregateCurrency } from '../shopping/utils/price.utils';

interface QuickAction {
  path: string;

  label: AppStringKey;

  icon: string;
}

@Component({
  selector: 'app-dashboard',

  standalone: true,

  imports: [CommonModule, RouterLink],

  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  i18n = inject(I18nService);

  cart = inject(CartService);

  purchaseRepo = inject(PurchaseRepository);
  commerceRepo = inject(CommerceRepository);

  purchases = signal<Purchase[]>([]);

  quickActions: QuickAction[] = [
    { path: '/products', label: 'products', icon: 'inventory_2' },

    { path: '/cart', label: 'cart', icon: 'shopping_cart' },

    { path: '/currencies', label: 'currencies', icon: 'payments' },

    { path: '/finance', label: 'finances', icon: 'account_balance_wallet' },
  ];

  ngOnInit() {
    forkJoin({
      purchases: this.purchaseRepo.list(1),
      commerces: this.commerceRepo.list(),
    }).subscribe({
      next: ({ purchases, commerces }) => {
        const enriched = enrichPurchaseCommerceNames(purchases.results.slice(0, 5), commerces);
        this.purchases.set(enriched);
      },
      error: () => this.purchases.set([]),
    });
  }

  t(key: AppStringKey) {
    return this.i18n.t(key);
  }

  cartTotalLabel(): string {
    const items = this.cart.items();

    const currency = singleAggregateCurrency(items);

    return formatPrice(this.cart.grandTotal(), currency ?? '');
  }

  cartStoreCount(): number {
    return this.cart.commerceIds().length;
  }

  cartProgress(): number {
    return Math.min((this.cart.grandTotal() / 5000) * 100, 100);
  }

  purchaseProgress(): number {
    return Math.min((this.purchases().length / 10) * 100, 100);
  }

  formatMoney(value: string): string {
    return value;
  }
}
