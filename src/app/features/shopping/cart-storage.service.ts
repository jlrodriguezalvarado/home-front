import { Injectable } from '@angular/core';
import { CartItem } from '../../core/models/shopping.models';
import { normalizeStoredProduct } from '../products/product.mapper';
import { normalizePresentationUnit } from './utils/presentation-unit.utils';

const CART_KEY = 'shopping_cart_items_v4';
const LEGACY_CART_KEY = 'shopping_cart';
const FILTER_COMMERCE_KEY = 'shopping_cart_filter_commerce_id_v1';

@Injectable({
  providedIn: 'root',
})
export class CartStorageService {
  load(): CartItem[] {
    try {
      let raw = localStorage.getItem(CART_KEY);
      if (!raw) {
        raw = localStorage.getItem(LEGACY_CART_KEY);
      }
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const items: CartItem[] = [];
      for (const entry of parsed) {
        if (!entry || typeof entry !== 'object') continue;

        const quantity = Number(entry['quantity']);
        if (!Number.isFinite(quantity) || quantity <= 0) continue;

        const product = normalizeStoredProduct(entry['product'] as Record<string, unknown>);
        if (!product || !Number.isFinite(product.id)) continue;

        product.presentationUnit = normalizePresentationUnit(product.presentationUnit);
        const priceUpdatedAt = entry['priceUpdatedAt'] ?? entry['price_updated_at'];
        items.push({
          product,
          quantity,
          priceUpdatedAt: priceUpdatedAt != null ? String(priceUpdatedAt) : null,
        });
      }

      if (items.length > 0 && !localStorage.getItem(CART_KEY)) {
        this.save(items);
      }

      return items;
    } catch {
      return [];
    }
  }

  save(items: CartItem[]): void {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  loadFilterCommerceId(): string | null {
    const value = localStorage.getItem(FILTER_COMMERCE_KEY);
    return value?.trim() ? value : null;
  }

  saveFilterCommerceId(commerceId: string | null): void {
    if (commerceId) {
      localStorage.setItem(FILTER_COMMERCE_KEY, commerceId);
    } else {
      localStorage.removeItem(FILTER_COMMERCE_KEY);
    }
  }
}
