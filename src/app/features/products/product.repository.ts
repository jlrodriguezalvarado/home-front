import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PaginatedResponse, Category } from '../../core/api/models';
import { Product } from '../../core/models/shopping.models';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS } from '../../core/api/endpoints';
import { mapApiProductToProduct } from './product.mapper';

@Injectable({
  providedIn: 'root',
})
export class ProductRepository {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  list(params: {
    search?: string;
    commerce?: string;
    commerce_id?: string;
    category?: string;
    category_id?: string;
    page?: number;
    perPage?: number;
  }): Observable<PaginatedResponse<Product>> {
    let httpParams = new HttpParams();
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.commerce) httpParams = httpParams.set('commerce', params.commerce);
    if (params.commerce_id) httpParams = httpParams.set('commerce_id', params.commerce_id);
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.category_id) httpParams = httpParams.set('category_id', params.category_id);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.perPage) httpParams = httpParams.set('perPage', params.perPage.toString());

    return this.api.get<unknown>(API_ENDPOINTS.products.list, { params: httpParams }).pipe(
      map((resp) => this.mapPaginatedResponse(resp)),
    );
  }

  listByNextUrl(nextUrl: string): Observable<PaginatedResponse<Product>> {
    return this.http.get<unknown>(nextUrl).pipe(map((resp) => this.mapPaginatedResponse(resp)));
  }

  getCategories(params?: { commerce_id?: string }): Observable<Category[]> {
    let httpParams = new HttpParams();
    if (params?.commerce_id) {
      httpParams = httpParams.set('commerce_id', params.commerce_id);
    }

    return this.api
      .get<Category[] | PaginatedResponse<Category>>(API_ENDPOINTS.productCategories, {
        params: httpParams,
      })
      .pipe(map((res) => (Array.isArray(res) ? res : (res.results ?? []))));
  }

  update(id: string, data: Partial<Product>): Observable<Product> {
    return this.api.patch<unknown>(API_ENDPOINTS.products.detail(id), data).pipe(
      map((p) => mapApiProductToProduct(p as Record<string, unknown>)),
    );
  }

  scrapePricesByIds(productIds: string[]): Observable<Product[]> {
    return this.api
      .post<unknown[]>(API_ENDPOINTS.products.scrapeByIds, { product_ids: productIds })
      .pipe(map((items) => items.map((p) => mapApiProductToProduct(p as Record<string, unknown>))));
  }

  updatePricesByCommerce(
    commerceId: string,
    productIds: string[],
    externalIds?: string[],
  ): Observable<unknown> {
    const body: Record<string, string[]> = {};
    if (productIds.length) body['product_ids'] = productIds;
    if (externalIds?.length) body['external_ids'] = externalIds;
    return this.api.post(API_ENDPOINTS.commerces.updateProductsPriceBatch(commerceId), body);
  }

  private mapPaginatedResponse(resp: unknown): PaginatedResponse<Product> {
    const data = resp as Record<string, unknown>;
    const results = Array.isArray(resp) ? resp : ((data['results'] as unknown[]) ?? []);
    return {
      count: Array.isArray(resp) ? results.length : Number(data['count'] ?? results.length),
      next: Array.isArray(resp) ? null : ((data['next'] as string | null) ?? null),
      previous: Array.isArray(resp) ? null : ((data['previous'] as string | null) ?? null),
      results: results.map((p) => mapApiProductToProduct(p as Record<string, unknown>)),
    };
  }
}
