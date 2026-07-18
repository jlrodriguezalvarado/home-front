import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../../core/api/models';
import { CommerceReprocessResponse } from '../../core/notifications/notifications.models';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS } from '../../core/api/endpoints';
import { resolveMediaUrl } from '../../core/api/api-url';
import {
  CommerceDetail,
  CommerceListItem,
  RunSourceUrlScrapingPayload,
  ScrapingActionResponse,
  SourceUrlDetail,
  ProcessingJobSummary,
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
    return this.api.get<any[] | PaginatedResponse<any>>(API_ENDPOINTS.commerces.list).pipe(
      map((res) => {
        const items = Array.isArray(res) ? res : (res.results ?? []);
        return items.map(mapCommerceListItem);
      }),
    );
  }

  getById(commerceId: string): Observable<CommerceDetail> {
    return this.api.get<any>(API_ENDPOINTS.commerces.detail(commerceId)).pipe(
      map(mapCommerceDetail),
    );
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
    return this.api.post(
      API_ENDPOINTS.commerces.updateProductsPriceBatch(commerceId),
      body,
    );
  }
}

function mapCommerceBase(c: any) {
  return {
    id: c.id,
    name: c.name,
    logo: resolveMediaUrl(c.image ?? c.logo),
    currencyCode: c.default_currency?.code ?? c.currency_code ?? '',
    currencySymbol: c.default_currency?.symbol ?? '',
  };
}

function mapProcessingJob(j: any): ProcessingJobSummary {
  return {
    id: j.id,
    jobType: j.job_type ?? '',
    status: j.status,
    startedAt: j.started_at ?? null,
    finishedAt: j.finished_at ?? null,
    errorMessage: j.error_message ?? null,
  };
}

function mapSourceUrlDetail(u: any): SourceUrlDetail {
  return {
    id: u.id,
    commerce: u.commerce,
    name: u.name,
    url: u.url,
    sourceType: u.source_type ?? '',
    isActive: u.is_active ?? false,
    notes: u.notes ?? null,
    isProcessing: u.is_processing ?? false,
    latestJob: u.latest_job ? mapProcessingJob(u.latest_job) : null,
  };
}

function mapCommerceListItem(c: any): CommerceListItem {
  return {
    ...mapCommerceBase(c),
    urlsProcessing: c.urls_processing ?? false,
    activeJobsCount: c.active_jobs_count ?? 0,
  };
}

function mapCommerceDetail(c: any): CommerceDetail {
  return {
    ...mapCommerceBase(c),
    urlsProcessing: c.urls_processing ?? false,
    activeJobs: (c.active_jobs ?? []).map(mapProcessingJob),
    sourceUrls: (c.source_urls ?? []).map(mapSourceUrlDetail),
    reprocessStrategy: c.reprocess_strategy ?? null,
    wasReprocessedToday: c.was_reprocessed_today ?? false,
  };
}
