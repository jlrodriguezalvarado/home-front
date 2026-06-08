import { Injectable, signal, computed, inject } from '@angular/core';
import { CartItem, Product } from '../../core/models/shopping.models';
import { ProductRepository } from '../products/product.repository';
import { CartStorageService } from './cart-storage.service';
import { ProductFilterStorageService } from '../products/product-filter-storage.service';
import {
  isPresentationUnitKg,
  normalizeQuantityForUnit,
} from './utils/presentation-unit.utils';
import {
  contributesToTotalQuantityCount,
  lineTotal,
  normalizeProductCurrency,
  singleAggregateCurrency,
} from './utils/price.utils';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly storage = inject(CartStorageService);
  private readonly productRepo = inject(ProductRepository);
  private readonly productFilter = inject(ProductFilterStorageService);

  private _items = signal<CartItem[]>([]);
  private _hydrated = false;

  items = this._items.asReadonly();

  grandTotal = computed(() =>
    this._items().reduce(
      (sum, item) => sum + item.product.originalPrice * item.quantity,
      0,
    ),
  );

  itemsByCommerce = computed(() => {
    const groups: Record<string, CartItem[]> = {};
    for (const item of this._items()) {
      const commerceId = item.product.commerceId?.trim() ?? '';
      if (!commerceId) continue;
      if (!groups[commerceId]) groups[commerceId] = [];
      groups[commerceId].push(item);
    }
    return groups;
  });

  cartQuantitiesByProductId = computed(() => {
    const map = new Map<number, number>();
    for (const item of this._items()) {
      map.set(item.product.id, (map.get(item.product.id) ?? 0) + item.quantity);
    }
    return map;
  });

  visibleQuantityCountFor(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + contributesToTotalQuantityCount(item), 0);
  }

  hydrate(items: CartItem[]): void {
    this._items.set(items.map((item) => ({ ...item, product: this.normalizeProduct(item.product) })));
    this._hydrated = true;
    this.persist();
  }

  private normalizeProduct(product: Product): Product {
    return { ...product, originalCurrency: normalizeProductCurrency(product) };
  }

  commerceSubtotal(commerceId: string): number {
    const items = this.itemsByCommerce()[commerceId] ?? [];
    return items.reduce((sum, item) => sum + item.product.originalPrice * item.quantity, 0);
  }

  commerceIds(): string[] {
    return Object.keys(this.itemsByCommerce()).filter((id) => id.trim());
  }

  /** Backfill missing commerceId on legacy cart lines using the products-page selection. */
  repairMissingCommerceIds(preferredCommerceId: string | null): void {
    const fallback = preferredCommerceId?.trim();
    if (!fallback) return;

    let changed = false;
    const updated = this._items().map((item) => {
      if (item.product.commerceId?.trim()) return item;
      changed = true;
      return {
        ...item,
        product: { ...item.product, commerceId: fallback },
      };
    });

    if (changed) {
      this._items.set(updated);
      this.persist();
    }
  }

  visibleTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + lineTotal(item), 0);
  }

  visibleTotalCurrency(items: CartItem[]): string | null {
    return singleAggregateCurrency(items);
  }

  addProduct(product: Product): void {
    this.ensureHydrated();
    const snapshot = this.normalizeProduct({
      ...product,
      commerceId: product.commerceId?.trim() ?? '',
    });
    this._items.update((items) => {
      const existing = items.find((i) => i.product.id === snapshot.id);
      if (existing) {
        return items.map((i) =>
          i.product.id === snapshot.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...items, { product: snapshot, quantity: 1 }];
    });
    this.persist();
  }

  setQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeProduct(productId);
      return;
    }

    const item = this._items().find((i) => i.product.id === productId);
    if (!item) return;

    const finalQty = normalizeQuantityForUnit(quantity, item.product.presentationUnit);

    this._items.update((items) =>
      items.map((i) => (i.product.id === productId ? { ...i, quantity: finalQty } : i)),
    );
    this.persist();
  }

  removeProduct(productId: number): void {
    this._items.update((items) => items.filter((i) => i.product.id !== productId));
    this.persist();
  }

  removeProducts(productIds: number[]): void {
    const idSet = new Set(productIds);
    this._items.update((items) => items.filter((i) => !idSet.has(i.product.id)));
    this.persist();
  }

  clearCart(): void {
    this._items.set([]);
    this.persist();
  }

  mergeProductQuantity(product: Product, quantity: number): void {
    if (quantity <= 0) return;

    const q = normalizeQuantityForUnit(quantity, product.presentationUnit);
    if (q <= 0) return;

    this._items.update((items) => {
      const existing = items.find((i) => i.product.id === product.id);
      if (existing) {
        return items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + q } : i,
        );
      }
      return [...items, { product, quantity: q }];
    });
    this.persist();
  }

  syncProductSnapshot(updated: Product): void {
    this._items.update((items) =>
      items.map((item) => {
        const matches =
          item.product.id === updated.id || item.product.apiId === updated.apiId;
        if (!matches) return item;

        let quantity = item.quantity;
        if (!isPresentationUnitKg(updated.presentationUnit)) {
          quantity = Math.round(quantity);
        }
        return { product: updated, quantity };
      }),
    );
    this.persist();
  }

  /** Load items from a previous purchase into the cart. */
  addItems(newItems: CartItem[]): { added: number; merged: number; failed: number } {
    let added = 0;
    let merged = 0;
    let failed = 0;

    this._items.update((items) => {
      let current = [...items];
      for (const newItem of newItems) {
        if (!newItem.product?.id) {
          failed++;
          continue;
        }

        const q = normalizeQuantityForUnit(newItem.quantity, newItem.product.presentationUnit);
        if (q <= 0) {
          failed++;
          continue;
        }

        const idx = current.findIndex((i) => i.product.id === newItem.product.id);
        if (idx > -1) {
          current[idx] = { ...current[idx], quantity: current[idx].quantity + q };
          merged++;
        } else {
          current.push({ product: newItem.product, quantity: q });
          added++;
        }
      }
      return current;
    });
    this.persist();
    return { added, merged, failed };
  }

  updatePrices(): void {
    const apiIds = this._items().map((i) => i.product.apiId);
    if (apiIds.length === 0) return;

    this.productRepo.scrapePricesByIds(apiIds).subscribe((updatedProducts) => {
      for (const updated of updatedProducts) {
        this.syncProductSnapshot(updated);
      }
    });
  }

  getFilterCommerceId(): string | null {
    return this.storage.loadFilterCommerceId();
  }

  setFilterCommerceId(commerceId: string | null): void {
    this.storage.saveFilterCommerceId(commerceId);
  }

  resolveEffectiveFilterCommerceId(): string | null {
    const ids = this.commerceIds();
    if (ids.length === 0) {
      this.setFilterCommerceId(null);
      return null;
    }

    const productCommerceId = this.productFilter.load()?.commerceId?.trim();
    if (productCommerceId && ids.includes(productCommerceId)) {
      this.setFilterCommerceId(productCommerceId);
      return productCommerceId;
    }

    const saved = this.getFilterCommerceId()?.trim();
    if (saved && ids.includes(saved)) return saved;

    const first = ids[0];
    this.setFilterCommerceId(first);
    return first;
  }

  private ensureHydrated(): void {
    if (this._hydrated) return;
    this.hydrate(this.storage.load());
  }

  private persist(): void {
    this.ensureHydrated();
    this.storage.save(this._items());
  }
}

export function initCart(cart: CartService, storage: CartStorageService): () => Promise<void> {
  return () => {
    const items = storage.load();
    cart.hydrate(items);
    return Promise.resolve();
  };
}
