import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PurchaseRepository, Purchase } from './purchase.repository';
import { CartService } from './cart.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { normalizeStoredProduct } from '../products/product.mapper';
import { CartItem } from '../../core/models/shopping.models';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './purchase-history.component.html',
  styleUrl: './purchase-history.component.scss',
})
export class PurchaseHistoryComponent implements OnInit {
  repo = inject(PurchaseRepository);
  cartService = inject(CartService);
  i18n = inject(I18nService);
  router = inject(Router);
  toast = inject(ToastService);

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
    const next = !p.isFavorite;
    this.repo.updateFavorite(p.id, next, p.favoriteName).subscribe(() => {
      p.isFavorite = next;
    });
  }

  usePurchase(p: Purchase) {
    if (!p.items || p.items.length === 0) {
      this.toast.info('No items to use');
      return;
    }

    const cartItems: CartItem[] = [];
    for (const item of p.items) {
      const product = normalizeStoredProduct(item.product as Record<string, unknown>);
      if (!product) continue;
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      cartItems.push({ product, quantity });
    }

    const result = this.cartService.addItems(cartItems);
    this.toast.success(`Order loaded: ${result.added} added, ${result.merged} merged.`);
    this.router.navigate(['/cart']);
  }

  viewDetail(p: Purchase) {
    this.router.navigate(['/purchases/detail'], { state: { purchase: p } });
  }
}
