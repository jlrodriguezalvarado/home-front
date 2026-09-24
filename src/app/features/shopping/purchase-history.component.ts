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
import { PurchaseNameDialogComponent } from './components/purchase-name-dialog/purchase-name-dialog.component';

type NameDialogMode = 'edit' | 'favorite';

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [
    CommonModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    PurchaseNameDialogComponent,
  ],
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
  nameDialogOpen = signal(false);
  nameDialogBusy = signal(false);
  nameDialogMode = signal<NameDialogMode>('edit');
  nameDialogPurchase = signal<Purchase | null>(null);

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

  displayName(p: Purchase): string {
    const name = (p.favoriteName || '').trim();
    return name || p.commerceName || this.i18n.t('orders');
  }

  editName(p: Purchase, event?: Event) {
    event?.stopPropagation();
    this.nameDialogMode.set('edit');
    this.nameDialogPurchase.set(p);
    this.nameDialogOpen.set(true);
  }

  toggleFavorite(p: Purchase, event?: Event) {
    event?.stopPropagation();
    const next = !p.isFavorite;
    const favoriteName = (p.favoriteName || '').trim();
    if (next && !favoriteName) {
      this.nameDialogMode.set('favorite');
      this.nameDialogPurchase.set(p);
      this.nameDialogOpen.set(true);
      return;
    }
    this.applyFavorite(p, next, favoriteName || p.favoriteName || '');
  }

  closeNameDialog() {
    if (this.nameDialogBusy()) return;
    this.nameDialogOpen.set(false);
    this.nameDialogPurchase.set(null);
  }

  onNameDialogSaved(name: string) {
    const purchase = this.nameDialogPurchase();
    if (!purchase) return;
    const mode = this.nameDialogMode();
    this.nameDialogBusy.set(true);
    if (mode === 'favorite') {
      this.repo.updateFavorite(purchase.id, true, name).subscribe({
        next: (updated) => {
          this.patchPurchase(purchase.id, {
            isFavorite: updated.isFavorite,
            favoriteName: updated.favoriteName,
          });
          this.nameDialogBusy.set(false);
          this.closeNameDialog();
        },
        error: () => {
          this.nameDialogBusy.set(false);
          this.toast.error(this.i18n.t('purchaseNameUpdateError'));
        },
      });
      return;
    }
    if (name === (purchase.favoriteName || '').trim()) {
      this.nameDialogBusy.set(false);
      this.closeNameDialog();
      return;
    }
    this.repo.updateName(purchase.id, name).subscribe({
      next: (updated) => {
        this.patchPurchase(purchase.id, { favoriteName: updated.favoriteName });
        this.nameDialogBusy.set(false);
        this.closeNameDialog();
        this.toast.success(this.i18n.t('purchaseNameUpdated'));
      },
      error: () => {
        this.nameDialogBusy.set(false);
        this.toast.error(this.i18n.t('purchaseNameUpdateError'));
      },
    });
  }

  usePurchase(p: Purchase, event?: Event) {
    event?.stopPropagation();
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

  private applyFavorite(p: Purchase, isFavorite: boolean, favoriteName: string) {
    this.repo.updateFavorite(p.id, isFavorite, favoriteName).subscribe({
      next: (updated) => {
        this.patchPurchase(p.id, {
          isFavorite: updated.isFavorite,
          favoriteName: updated.favoriteName,
        });
      },
      error: () => this.toast.error(this.i18n.t('purchaseNameUpdateError')),
    });
  }

  private patchPurchase(id: string, patch: Partial<Purchase>) {
    this.purchases.update((list) =>
      list.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }
}
