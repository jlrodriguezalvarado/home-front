import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, tap, catchError, map, firstValueFrom, finalize } from 'rxjs';
import { CartItem, Product } from '../../core/models/shopping.models';
import { AuthService } from '../../core/auth/auth.service';
import { ProductRepository } from '../products/product.repository';
import { CartRepository } from './cart.repository';
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
import { isPriceUpdatedToday } from './utils/cart-price.utils';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly storage = inject(CartStorageService);
  private readonly cartRepo = inject(CartRepository);
  private readonly productRepo = inject(ProductRepository);
  private readonly productFilter = inject(ProductFilterStorageService);
  private readonly auth = inject(AuthService);
  private _items = signal<CartItem[]>([]);
  private _hydrated = false;
  private _loadingFromServer = false;
  private _syncingToServer = false;
  private _persistTimer: ReturnType<typeof setTimeout> | null = null;
  pricesRefreshing = signal(false);
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
  hydrate(items: CartItem[], options?: { skipPersist?: boolean }): void {
    this._items.set(items.map((item) => this.normalizeCartItem(item)));
    this._hydrated = true;
    if (!options?.skipPersist) {
      this.persistLocal();
    }
  }
  private normalizeCartItem(item: CartItem): CartItem {
    return {
      ...item,
      product: this.normalizeProduct(item.product),
      priceUpdatedAt: item.priceUpdatedAt ?? item.product.extractionDate ?? null,
    };
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
      return [...items, { product: snapshot, quantity: 1, priceUpdatedAt: snapshot.extractionDate ?? null }];
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
      return [...items, { product, quantity: q, priceUpdatedAt: product.extractionDate ?? null }];
    });
    this.persist();
  }
  syncProductSnapshot(updated: Product, priceUpdatedAt?: string | null): void {
    const refreshedAt = priceUpdatedAt ?? updated.extractionDate ?? new Date().toISOString();
    this._items.update((items) =>
      items.map((item) => {
        const matches =
          item.product.id === updated.id || item.product.apiId === updated.apiId;
        if (!matches) return item;
        let quantity = item.quantity;
        if (!isPresentationUnitKg(updated.presentationUnit)) {
          quantity = Math.round(quantity);
        }
        return { product: updated, quantity, priceUpdatedAt: refreshedAt };
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
          current.push(this.normalizeCartItem(newItem));
          added++;
        }
      }
      return current;
    });
    this.persist();
    return { added, merged, failed };
  }
  /** Refresh stale prices when entering the cart (skips lines already updated today). */
  refreshPricesIfNeeded(): Observable<number> {
    if (this._items().length === 0) return of(0);
    if (this.pricesRefreshing()) return of(0);
    this.pricesRefreshing.set(true);
    const source$ = this.auth.isAuthenticated()
      ? this.cartRepo.refreshPrices(false).pipe(
          tap((result) => {
            this.applyServerCart(result.cart, { skipPersist: true });
            this.persistLocal();
          }),
          map((result) => result.updatedCount),
          catchError(() => this.refreshPricesLocally()),
        )
      : this.refreshPricesLocally();
    return source$.pipe(finalize(() => this.pricesRefreshing.set(false)));
  }
  syncFromServer(): Observable<void> {
    if (!this.auth.isAuthenticated()) return of(undefined);
    if (this._loadingFromServer) return of(undefined);
    this._loadingFromServer = true;
    const localItems = this._hydrated ? this._items() : this.storage.load();
    return this.cartRepo.getCurrent().pipe(
      map((serverCart) => {
        if (serverCart.items.length > 0) {
          this.applyServerCart(serverCart, { skipPersist: true });
          this.persistLocal();
          return undefined;
        }
        if (localItems.length > 0) {
          this.hydrate(localItems, { skipPersist: true });
          this.pushToServer();
          return undefined;
        }
        this.hydrate([], { skipPersist: true });
        return undefined;
      }),
      catchError(() => {
        if (!this._hydrated) {
          this.hydrate(localItems, { skipPersist: true });
        }
        return of(undefined);
      }),
      finalize(() => { this._loadingFromServer = false; }),
    );
  }
  getFilterCommerceId(): string | null {
    return this.storage.loadFilterCommerceId();
  }
  setFilterCommerceId(commerceId: string | null): void {
    this.storage.saveFilterCommerceId(commerceId);
    this.scheduleServerSync();
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
  private refreshPricesLocally(): Observable<number> {
    const staleItems = this._items()
      .filter((item) => !isPriceUpdatedToday(item.priceUpdatedAt ?? item.product.extractionDate));
    const staleApiIds = staleItems
      .map((item) => item.product.apiId)
      .filter((id) => id.trim());
    if (staleApiIds.length === 0) return of(0);
    const priceByApiId = new Map(
      staleItems.map((item) => [item.product.apiId, item.product.originalPrice] as const),
    );
    const refreshedAt = new Date().toISOString();
    return this.productRepo.scrapePricesByIds(staleApiIds).pipe(
      map((updatedProducts) => {
        let updatedCount = 0;
        for (const updated of updatedProducts) {
          const previousPrice = priceByApiId.get(updated.apiId);
          this.syncProductSnapshot(updated, refreshedAt);
          if (previousPrice !== undefined && previousPrice !== updated.originalPrice) {
            updatedCount++;
          }
        }
        return updatedCount;
      }),
      catchError(() => of(0)),
    );
  }
  private applyServerCart(
    cart: { items: CartItem[]; filterCommerceId: string | null },
    options?: { skipPersist?: boolean },
  ): void {
    this.hydrate(cart.items, { skipPersist: true });
    if (cart.filterCommerceId != null) {
      this.storage.saveFilterCommerceId(cart.filterCommerceId);
    }
    if (!options?.skipPersist) {
      this.persistLocal();
    }
  }
  private ensureHydrated(): void {
    if (this._hydrated) return;
    this.hydrate(this.storage.load(), { skipPersist: true });
  }
  private persist(): void {
    this.ensureHydrated();
    this.persistLocal();
    this.scheduleServerSync();
  }
  private persistLocal(): void {
    this.storage.save(this._items());
  }
  private scheduleServerSync(): void {
    if (!this.auth.isAuthenticated() || this._syncingToServer) return;
    if (this._persistTimer != null) {
      clearTimeout(this._persistTimer);
    }
    this._persistTimer = setTimeout(() => this.pushToServer(), 400);
  }
  private pushToServer(): void {
    if (!this.auth.isAuthenticated() || this._syncingToServer) return;
    this._syncingToServer = true;
    const payload = {
      filterCommerceId: this.getFilterCommerceId(),
      items: this._items().map((item) => ({
        productId: item.product.apiId,
        quantity: item.quantity,
      })),
    };
    this.cartRepo.syncCurrent(payload).subscribe({
      next: (cart) => {
        this.applyServerCart(cart, { skipPersist: true });
        this.persistLocal();
        this._syncingToServer = false;
      },
      error: () => {
        this._syncingToServer = false;
      },
    });
  }
}

export function initCart(
  cart: CartService,
  storage: CartStorageService,
  auth: AuthService,
): () => Promise<void> {
  return () => {
    const items = storage.load();
    cart.hydrate(items, { skipPersist: true });
    if (!auth.isAuthenticated()) {
      return Promise.resolve();
    }
    return firstValueFrom(cart.syncFromServer()).then(() => undefined).catch(() => undefined);
  };
}
