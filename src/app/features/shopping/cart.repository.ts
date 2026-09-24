import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS } from '../../core/api/endpoints';
import { CartItem } from '../../core/models/shopping.models';
import { mapApiProductToProduct } from '../products/product.mapper';
import { normalizePresentationUnit } from './utils/presentation-unit.utils';

export interface DraftCart {
  id: string;
  status: string;
  filterCommerceId: string | null;
  items: CartItem[];
  updatedAt: string;
}

export interface CartPriceRefreshResult {
  cart: DraftCart;
  updatedCount: number;
  skippedCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartRepository {
  private readonly api = inject(ApiService);

  getCurrent(): Observable<DraftCart> {
    return this.api.get<unknown>(API_ENDPOINTS.carts.current).pipe(
      map((resp) => this.mapDraftCart(resp as Record<string, unknown>)),
    );
  }

  syncCurrent(payload: {
    filterCommerceId: string | null;
    items: { productId: string; quantity: number }[];
  }): Observable<DraftCart> {
    return this.api.put<unknown>(API_ENDPOINTS.carts.current, {
      filter_commerce_id: payload.filterCommerceId,
      items: payload.items.map((item) => ({
        product: item.productId,
        quantity: String(item.quantity),
      })),
    }).pipe(
      map((resp) => this.mapDraftCart(resp as Record<string, unknown>)),
    );
  }

  refreshPrices(force = false): Observable<CartPriceRefreshResult> {
    return this.api.post<unknown>(API_ENDPOINTS.carts.refreshPrices, { force }).pipe(
      map((resp) => this.mapPriceRefreshResult(resp as Record<string, unknown>)),
    );
  }

  parseDraftCart(raw: unknown): DraftCart {
    return this.mapDraftCart(raw as Record<string, unknown>);
  }

  private mapPriceRefreshResult(raw: Record<string, unknown>): CartPriceRefreshResult {
    const cartRaw = (raw['cart'] as Record<string, unknown> | undefined) ?? raw;
    return {
      cart: this.mapDraftCart(cartRaw),
      updatedCount: Number(raw['updated_count'] ?? raw['updatedCount'] ?? 0),
      skippedCount: Number(raw['skipped_count'] ?? raw['skippedCount'] ?? 0),
    };
  }

  private mapDraftCart(raw: Record<string, unknown>): DraftCart {
    const lines = raw['items'] ?? raw['lines'] ?? [];
    const items = Array.isArray(lines)
      ? lines.map((line) => this.mapCartLine(line as Record<string, unknown>))
      : [];
    return {
      id: String(raw['id'] ?? ''),
      status: String(raw['status'] ?? 'draft'),
      filterCommerceId: this.readNullableId(raw['filter_commerce_id'] ?? raw['filterCommerceId']),
      items,
      updatedAt: String(raw['updated_at'] ?? raw['updatedAt'] ?? ''),
    };
  }

  private mapCartLine(line: Record<string, unknown>): CartItem {
    const productRaw = line['product'] ?? line['product_snapshot'] ?? {};
    const product = mapApiProductToProduct(
      typeof productRaw === 'object' && productRaw != null
        ? (productRaw as Record<string, unknown>)
        : { id: productRaw },
    );
    product.presentationUnit = normalizePresentationUnit(product.presentationUnit);
    const quantity = parseFloat(String(line['quantity'] ?? '0'));
    const priceUpdatedAt = String(
      line['price_updated_at'] ?? line['priceUpdatedAt'] ?? product.extractionDate ?? '',
    );
    return {
      product,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      priceUpdatedAt: priceUpdatedAt || null,
    };
  }

  private readNullableId(value: unknown): string | null {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
  }
}
