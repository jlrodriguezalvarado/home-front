import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { Product } from '../../../core/models/shopping.models';
import { CartRepository, DraftCart } from '../cart.repository';
import {
  mapBasketComparisonDetail,
  mapBasketComparisonList,
  mapSuggestProducts,
} from './basket-comparison.mapper';
import {
  BasketComparisonDetail,
  BasketComparisonListItem,
  BasketFromCartPayload,
  BasketPatchPayload,
  BasketSavePayload,
  BasketSetPricePayload,
} from './basket-comparison.models';

@Injectable({ providedIn: 'root' })
export class BasketComparisonRepository {
  private readonly api = inject(ApiService);
  private readonly cartRepo = inject(CartRepository);

  getCurrent(): Observable<BasketComparisonDetail> {
    return this.api
      .get<unknown>(API_ENDPOINTS.basketComparisons.current)
      .pipe(map(mapBasketComparisonDetail));
  }

  updateCurrent(payload: BasketPatchPayload): Observable<BasketComparisonDetail> {
    return this.api
      .put<unknown>(API_ENDPOINTS.basketComparisons.current, this.toCurrentBody(payload))
      .pipe(map(mapBasketComparisonDetail));
  }

  fromCart(payload: BasketFromCartPayload = {}): Observable<BasketComparisonDetail> {
    const body: Record<string, string | null> = {};
    if (payload.commerceId !== undefined) {
      body['commerce_id'] = payload.commerceId;
    }
    return this.api
      .post<unknown>(API_ENDPOINTS.basketComparisons.fromCart, body)
      .pipe(map(mapBasketComparisonDetail));
  }

  list(): Observable<BasketComparisonListItem[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.basketComparisons.list)
      .pipe(map(mapBasketComparisonList));
  }

  get(id: string): Observable<BasketComparisonDetail> {
    return this.api
      .get<unknown>(API_ENDPOINTS.basketComparisons.detail(id))
      .pipe(map(mapBasketComparisonDetail));
  }

  saveFromCurrent(payload: BasketSavePayload): Observable<BasketComparisonDetail> {
    return this.api
      .post<unknown>(API_ENDPOINTS.basketComparisons.list, {
        name: payload.name,
        description: payload.description ?? '',
        from_current: true,
      })
      .pipe(map(mapBasketComparisonDetail));
  }

  patch(id: string, payload: BasketPatchPayload): Observable<BasketComparisonDetail> {
    return this.api
      .patch<unknown>(API_ENDPOINTS.basketComparisons.detail(id), this.toPatchBody(payload))
      .pipe(map(mapBasketComparisonDetail));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.basketComparisons.detail(id));
  }

  loadToCart(id: string): Observable<DraftCart> {
    return this.api.post<unknown>(API_ENDPOINTS.basketComparisons.loadToCart(id), {}).pipe(
      map((resp) => this.cartRepo.parseDraftCart(resp)),
    );
  }

  setPrice(
    comparisonId: string,
    lineId: string,
    payload: BasketSetPricePayload,
  ): Observable<BasketComparisonDetail> {
    return this.api
      .post<unknown>(API_ENDPOINTS.basketComparisons.setPrice(comparisonId, lineId), {
        commerce_id: payload.commerceId,
        mode: payload.mode,
        linked_product_id: payload.linkedProductId ?? null,
        override_price: payload.overridePrice ?? null,
      })
      .pipe(map(mapBasketComparisonDetail));
  }

  clearPrice(
    comparisonId: string,
    lineId: string,
    commerceId: string,
  ): Observable<BasketComparisonDetail> {
    return this.api
      .delete<void>(API_ENDPOINTS.basketComparisons.clearPrice(comparisonId, lineId, commerceId))
      .pipe(switchMap(() => this.get(comparisonId)));
  }

  suggest(
    comparisonId: string,
    lineId: string,
    commerceId: string,
  ): Observable<Product[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.basketComparisons.suggest(comparisonId, lineId), {
        params: { commerce_id: commerceId },
      })
      .pipe(map(mapSuggestProducts));
  }

  private toCurrentBody(payload: BasketPatchPayload): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (payload.name !== undefined) body['name'] = payload.name;
    if (payload.description !== undefined) body['description'] = payload.description;
    if (payload.commerceIds !== undefined) body['commerce_ids'] = payload.commerceIds;
    return body;
  }

  private toPatchBody(payload: BasketPatchPayload): Record<string, unknown> {
    return this.toCurrentBody(payload);
  }
}
