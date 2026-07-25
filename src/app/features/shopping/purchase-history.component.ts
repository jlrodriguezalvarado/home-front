import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { enrichPurchaseCommerceNames, Purchase, PurchaseRepository } from './purchase.repository';
import { CommerceRepository } from '../commerce/commerce.repository';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './purchase-history.component.scss',
})
export class PurchaseHistoryComponent implements OnInit {
  repo = inject(PurchaseRepository);
  commerceRepo = inject(CommerceRepository);
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
    forkJoin({
      purchases: this.repo.list(this.currentPage),
      commerces: this.commerceRepo.list(),
    }).subscribe({
      next: ({ purchases, commerces }) => {
        const enriched = enrichPurchaseCommerceNames(purchases.results, commerces);
        this.purchases.update((prev) => [...prev, ...enriched]);
        this.hasMore.set(!!purchases.next);
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
    this.router.navigate(['/purchases/detail'], {
      state: { purchase: p },
      queryParams: { id: p.id },
    });
  }
}
