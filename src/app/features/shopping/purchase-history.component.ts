import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PurchaseRepository, Purchase } from './purchase.repository';
import { CartService } from './cart.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold">{{ i18n.t('purchaseHistory') }}</h1>

      <app-loading-state *ngIf="loading() && purchases().length === 0"></app-loading-state>
      <app-error-state *ngIf="error()" (retry)="loadPurchases()"></app-error-state>
      <app-empty-state *ngIf="!loading() && !error() && purchases().length === 0" icon="📜"></app-empty-state>

      <div class="space-y-4">
        <div *ngFor="let p of purchases()" class="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-sm border dark:border-gray-800 flex items-center justify-between">
          <div class="flex-1 cursor-pointer" (click)="viewDetail(p)">
            <div class="font-bold">{{ p.commerceName }}</div>
            <div class="text-sm text-gray-500">{{ p.date | date:'mediumDate' }}</div>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-primary font-bold">{{ p.total }}</div>
            <button (click)="usePurchase(p)" class="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary hover:text-white transition-colors">
              USE
            </button>
            <button (click)="toggleFavorite(p)" class="text-xl">
              {{ p.isFavorite ? '❤️' : '🤍' }}
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="hasMore()" class="flex justify-center py-4">
        <button (click)="loadMore()" [disabled]="loading()" class="px-6 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg">
          {{ loading() ? '...' : 'Load more' }}
        </button>
      </div>
    </div>
  `
})
export class PurchaseHistoryComponent implements OnInit {
  repo = inject(PurchaseRepository);
  cartService = inject(CartService);
  i18n = inject(I18nService);
  router = inject(Router);

  purchases = signal<Purchase[]>([]);
  currentPage = 1;
  loading = signal(false);
  error = signal(false);
  hasMore = signal(false);

  ngOnInit() {
    this.loadPurchases();
  }

  loadPurchases() {
    this.loading.set(true);
    this.error.set(false);
    this.repo.list(this.currentPage).subscribe({
      next: (res) => {
        this.purchases.update((prev) => [...prev, ...res.results]);
        this.hasMore.set(!!res.next);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  loadMore() {
    this.currentPage++;
    this.loadPurchases();
  }

  toggleFavorite(p: Purchase) {
    this.repo.toggleFavorite(p.id).subscribe(() => {
      p.isFavorite = !p.isFavorite;
    });
  }

  usePurchase(p: Purchase) {
    if (!p.items || p.items.length === 0) {
      alert('No items to use');
      return;
    }

    const cartItems = p.items.map((item: any) => ({
      product: item.product,
      quantity: item.quantity.toString(),
    }));

    const result = this.cartService.addItems(cartItems);
    alert(`Order loaded: ${result.added} added, ${result.merged} merged.`);
    this.router.navigate(['/cart']);
  }

  viewDetail(p: Purchase) {
    this.router.navigate(['/purchases/detail'], { state: { purchase: p } });
  }
}
