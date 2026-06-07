import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Product } from '../../core/api/models';
import { ProductRepository } from '../products/product.repository';
import { Decimal } from 'decimal.js';

export interface CartItem {
  product: Product;
  quantity: string; // stored as string decimal
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_KEY = 'shopping_cart';
  private _items = signal<CartItem[]>(this.loadCart());
  private productRepo = inject(ProductRepository);

  items = this._items.asReadonly();

  count = computed(() => this._items().length);

  totalByCommerce = computed(() => {
    const groups: Record<string, { commerceName: string, items: CartItem[], subtotal: string }> = {};

    this._items().forEach(item => {
      const commerceId = item.product.commerce.id;
      if (!groups[commerceId]) {
        groups[commerceId] = {
          commerceName: item.product.commerce.name,
          items: [],
          subtotal: '0'
        };
      }
      groups[commerceId].items.push(item);
      const itemTotal = new Decimal(item.product.price).mul(new Decimal(item.quantity));
      groups[commerceId].subtotal = new Decimal(groups[commerceId].subtotal).add(itemTotal).toString();
    });

    return Object.values(groups);
  });

  constructor() {
    effect(() => {
      localStorage.setItem(this.CART_KEY, JSON.stringify(this._items()));
    });
  }

  addToCart(product: Product, quantity: string = '1') {
    this._items.update((items) => {
      const existing = items.find((i) => i.product.id === product.id);
      if (existing) {
        return items.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: new Decimal(i.quantity).add(new Decimal(quantity)).toString() }
            : i,
        );
      }
      return [...items, { product, quantity }];
    });
  }

  addItems(newItems: CartItem[]): { added: number; merged: number; failed: number } {
    let added = 0;
    let merged = 0;
    let failed = 0;

    this._items.update((items) => {
      let currentItems = [...items];
      for (const newItem of newItems) {
        if (!newItem.product || !newItem.product.id) {
          failed++;
          continue;
        }

        const existingIndex = currentItems.findIndex((i) => i.product.id === newItem.product.id);
        if (existingIndex > -1) {
          const updatedItem = {
            ...currentItems[existingIndex],
            quantity: new Decimal(currentItems[existingIndex].quantity)
              .add(new Decimal(newItem.quantity))
              .toString(),
          };
          currentItems[existingIndex] = updatedItem;
          merged++;
        } else {
          currentItems.push(newItem);
          added++;
        }
      }
      return currentItems;
    });

    return { added, merged, failed };
  }

  updateQuantity(productId: string, quantity: string) {
    if (new Decimal(quantity).lte(0)) {
      this.removeFromCart(productId);
      return;
    }
    this._items.update(items => items.map(i => i.product.id === productId ? { ...i, quantity } : i));
  }

  removeFromCart(productId: string) {
    this._items.update(items => items.filter(i => i.product.id !== productId));
  }

  clearCart() {
    this._items.set([]);
  }

  updatePrices() {
    const ids = this._items().map((i) => i.product.id);
    if (ids.length === 0) return;

    this.productRepo.updatePrices(ids).subscribe((updatedProducts) => {
      this._items.update((items) =>
        items.map((item) => {
          const updated = updatedProducts.find((p) => p.id === item.product.id);
          return updated ? { ...item, product: updated } : item;
        }),
      );
      alert('Prices updated');
    });
  }

  private loadCart(): CartItem[] {
    const saved = localStorage.getItem(this.CART_KEY);
    return saved ? JSON.parse(saved) : [];
  }
}
