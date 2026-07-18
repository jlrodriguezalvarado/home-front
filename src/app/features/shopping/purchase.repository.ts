import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../../core/api/models';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS } from '../../core/api/endpoints';
import { formatPrice, resolveCurrencyCode } from './utils/price.utils';

export interface PurchaseLineItem {
  id?: string;
  product: Record<string, unknown>;
  quantity: number;
  price: number;
}

export interface Purchase {
  id: string;
  date: string;
  total: string;
  commerceId: string;
  commerceName: string;
  currency: string;
  items: PurchaseLineItem[];
  isFavorite: boolean;
  favoriteName?: string;
}

export function enrichPurchaseCommerceNames(
  purchases: Purchase[],
  commerces: { id: string; name: string }[],
): Purchase[] {
  const byId = new Map(commerces.map((c) => [c.id, c.name]));
  return purchases.map((p) => ({
    ...p,
    commerceName: p.commerceName || byId.get(p.commerceId) || '',
  }));
}

@Injectable({
  providedIn: 'root',
})
export class PurchaseRepository {
  private readonly api = inject(ApiService);

  list(page = 1, favorite?: boolean): Observable<PaginatedResponse<Purchase>> {
    let params = new HttpParams().set('page', page.toString());
    if (favorite) params = params.set('favorite', 'true');
    return this.api.get<any>(API_ENDPOINTS.purchases.list, { params }).pipe(
      map((resp) => ({
        ...resp,
        results: resp.results.map((p: any) => this.mapPurchase(p)),
      })),
    );
  }

  get(id: string): Observable<Purchase> {
    return this.api.get<any>(API_ENDPOINTS.purchases.detail(id)).pipe(
      map((p) => this.mapPurchase(p)),
    );
  }

  create(data: unknown): Observable<Purchase> {
    return this.api.post<any>(API_ENDPOINTS.purchases.list, data).pipe(
      map((p) => this.mapPurchase(p)),
    );
  }

  updateFavorite(id: string, isFavorite: boolean, favoriteName = ''): Observable<Purchase> {
    return this.api
      .patch<any>(API_ENDPOINTS.purchases.detail(id), {
        is_favorite: isFavorite,
        favorite_name: favoriteName,
      })
      .pipe(map((p) => this.mapPurchase(p)));
  }

  private mapPurchase(p: any): Purchase {
    const currency = resolveCurrencyCode(p.currency);
    const rawTotal = String(p.grand_total ?? p.total ?? '0');
    const commerce = p.commerce;
    const commerceId = String(
      p.commerce_id ?? (commerce && typeof commerce === 'object' ? commerce.id : commerce) ?? '',
    ).trim();
    const commerceName = String(
      p.commerce_name ?? (commerce && typeof commerce === 'object' ? commerce.name : '') ?? '',
    ).trim();
    const lines = p.lines ?? p.items ?? [];
    return {
      id: p.id,
      date: p.created_at ?? p.date ?? '',
      total: currency ? formatPrice(parseFloat(rawTotal), currency) : rawTotal,
      commerceId,
      commerceName,
      currency,
      items: Array.isArray(lines) ? lines.map((line: any) => this.mapLine(line)) : [],
      isFavorite: !!p.is_favorite,
      favoriteName: p.favorite_name,
    };
  }

  private mapLine(line: Record<string, unknown>): PurchaseLineItem {
    const rawProduct = line['product'] ?? line['product_snapshot'] ?? {};
    const product: Record<string, unknown> =
      typeof rawProduct === 'string'
        ? { id: rawProduct }
        : { ...(rawProduct as Record<string, unknown>) };
    if (!product['name'] && line['product_name']) {
      product['name'] = line['product_name'];
    }
    const unit = product['unit'] ?? product['presentation_unit'] ?? line['unit'] ?? 'unit';
    product['unit'] = unit;
    const quantity = parseFloat(String(line['quantity'] ?? '0'));
    const price = parseFloat(String(line['unit_price'] ?? line['price'] ?? '0'));
    return {
      id: line['id'] != null ? String(line['id']) : undefined,
      product,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      price: Number.isFinite(price) ? price : 0,
    };
  }
}
