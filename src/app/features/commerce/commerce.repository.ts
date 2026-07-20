import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CommerceReprocessResponse } from '../../core/notifications/notifications.models';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS } from '../../core/api/endpoints';
import { ApiListResponse, apiListResults } from '../../core/api/api-page';
import { CommerceDetailDto, CommerceListDto } from './commerce.dto';
import { mapCommerceDetail, mapCommerceListItem } from './commerce.mapper';
import {
  CommerceDetail,
  CommerceListItem,
  RunSourceUrlScrapingPayload,
  ScrapingActionResponse,
} from './commerce.models';

@Injectable({
  providedIn: 'root',
})
export class CommerceRepository {
  private readonly api = inject(ApiService);

  getList(): Observable<CommerceListItem[]> {
    return this.list();
  }

  list(): Observable<CommerceListItem[]> {
    return this.api
      .get<ApiListResponse<CommerceListDto>>(API_ENDPOINTS.commerces.list)
      .pipe(map((res) => apiListResults(res).map(mapCommerceListItem)));
  }

  getById(commerceId: string): Observable<CommerceDetail> {
    return this.api
      .get<CommerceDetailDto>(API_ENDPOINTS.commerces.detail(commerceId))
      .pipe(map(mapCommerceDetail));
  }

  runSourceUrlScraping(
    commerceId: string,
    payload: RunSourceUrlScrapingPayload,
  ): Observable<ScrapingActionResponse> {
    return this.api.post<ScrapingActionResponse>(
      API_ENDPOINTS.commerces.runSourceUrlScraping(commerceId),
      payload,
    );
  }

  runScrapingBatch(commerceId: string): Observable<ScrapingActionResponse> {
    return this.api.post<ScrapingActionResponse>(
      API_ENDPOINTS.commerces.runScrapingBatch(commerceId),
      {},
    );
  }

  reprocessProductUrls(commerceId: string): Observable<CommerceReprocessResponse> {
    return this.api.post<CommerceReprocessResponse>(
      API_ENDPOINTS.commerces.reprocessProductUrls(commerceId),
      {},
    );
  }

  updateProductsPriceBatch(
    commerceId: string,
    body: { product_ids?: string[]; external_ids?: string[] } = {},
  ): Observable<unknown> {
    return this.api.post(API_ENDPOINTS.commerces.updateProductsPriceBatch(commerceId), body);
  }
}
