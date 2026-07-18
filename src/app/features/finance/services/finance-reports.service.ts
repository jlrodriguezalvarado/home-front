import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap, timer, takeWhile, last } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { PaginatedResponse } from '../../../core/api/models';
import {
  FinancialYearOption,
  GeneratedReport,
  GeneratedReportStatus,
} from '../models/finance.models';

export interface ReportListOptions {
  status?: GeneratedReportStatus;
  financialYear?: string;
  page?: number;
  perPage?: number;
}

const DEFAULT_PER_PAGE = 20;

@Injectable({
  providedIn: 'root',
})
export class FinanceReportsService {
  private readonly api = inject(ApiService);

  listYears(): Observable<FinancialYearOption[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.finance.years, { params: { perPage: 200 } })
      .pipe(
        map((res) => this.decodeList(res).map((item) => ({
          id: String(item['id'] ?? ''),
          year: Number(item['year']),
        }))),
      );
  }

  listByYear(year: number, options: ReportListOptions = {}): Observable<PaginatedResponse<GeneratedReport>> {
    const params: Record<string, string | number> = {
      year,
      perPage: options.perPage ?? DEFAULT_PER_PAGE,
    };
    if (options.status) params['status'] = options.status;
    if (options.financialYear) params['financial_year'] = options.financialYear;
    if (options.page != null) params['page'] = options.page;
    return this.fetchReports(params).pipe(
      switchMap((res) => {
        if (res.results.length > 0 || res.count > 0) return of(res);
        if (options.financialYear) {
          return this.fetchReports({
            financial_year: options.financialYear,
            perPage: options.perPage ?? DEFAULT_PER_PAGE,
            ...(options.page != null ? { page: options.page } : {}),
            ...(options.status ? { status: options.status } : {}),
          }).pipe(
            switchMap((byFinancialYear) => {
              if (byFinancialYear.results.length > 0 || byFinancialYear.count > 0) return of(byFinancialYear);
              return this.fetchAllFilteredByYear(year, options);
            }),
          );
        }
        return this.fetchAllFilteredByYear(year, options);
      }),
    );
  }

  private fetchAllFilteredByYear(year: number, options: ReportListOptions): Observable<PaginatedResponse<GeneratedReport>> {
    const params: Record<string, string | number> = { perPage: 200 };
    if (options.status) params['status'] = options.status;
    return this.fetchReports(params).pipe(
      map((res) => {
        const filtered = res.results.filter((report) => report.year === year);
        return {
          count: filtered.length,
          next: null,
          previous: null,
          results: filtered,
        };
      }),
    );
  }

  private fetchReports(params: Record<string, string | number>): Observable<PaginatedResponse<GeneratedReport>> {
    return this.api
      .get<unknown>(API_ENDPOINTS.finance.reports, { params })
      .pipe(map((res) => this.decodePaginated(res)));
  }

  getById(id: string): Observable<GeneratedReport> {
    return this.api
      .get<Record<string, unknown>>(`${API_ENDPOINTS.finance.reports}${id}/`)
      .pipe(map((res) => this.mapReport(res)));
  }

  generate(year: number, triggeredFromMonth?: number): Observable<GeneratedReport> {
    const body: Record<string, unknown> = { year };
    if (triggeredFromMonth != null) body['triggered_from_month'] = triggeredFromMonth;
    return this.api
      .post<Record<string, unknown>>(API_ENDPOINTS.finance.reportsGenerate, body)
      .pipe(map((res) => this.mapReport(res)));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`${API_ENDPOINTS.finance.reports}${id}/`);
  }

  waitForReportCompletion(
    initial: GeneratedReport,
    pollIntervalMs = 3000,
    timeoutMs = 300000,
  ): Observable<GeneratedReport> {
    const deadline = Date.now() + timeoutMs;
    return timer(0, pollIntervalMs).pipe(
      switchMap(() => {
        if (Date.now() > deadline) return of(initial);
        return this.getById(initial.id);
      }),
      takeWhile((report) => isReportPending(report) && Date.now() <= deadline, true),
      last(),
    );
  }

  private decodePaginated(res: unknown): PaginatedResponse<GeneratedReport> {
    if (Array.isArray(res)) {
      const items = res.map((item) => this.mapReport(item as Record<string, unknown>));
      return { count: items.length, next: null, previous: null, results: items };
    }
    const body = (res && typeof res === 'object' ? res : {}) as Record<string, unknown>;
    const results = Array.isArray(body['results'])
      ? (body['results'] as Record<string, unknown>[]).map((item) => this.mapReport(item))
      : [];
    return {
      count: Number(body['count'] ?? results.length),
      next: body['next'] != null ? String(body['next']) : null,
      previous: body['previous'] != null ? String(body['previous']) : null,
      results,
    };
  }

  private decodeList(data: unknown): Record<string, unknown>[] {
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)) {
      return (data as { results: Record<string, unknown>[] }).results;
    }
    return [];
  }

  private mapReport(res: Record<string, unknown>): GeneratedReport {
    const included = res['included_months'];
    const status = String(res['status'] ?? 'pending').toLowerCase() as GeneratedReportStatus;
    const financialYearRaw = res['financial_year'];
    let financialYear = '';
    let year = Number(res['year'] ?? 0);
    if (financialYearRaw != null && typeof financialYearRaw === 'object') {
      const fy = financialYearRaw as Record<string, unknown>;
      financialYear = String(fy['id'] ?? '');
      if (!year && fy['year'] != null) year = Number(fy['year']);
    } else if (financialYearRaw != null) {
      financialYear = String(financialYearRaw);
    }
    return {
      id: String(res['id'] ?? ''),
      financialYear,
      year,
      triggeredFromMonth:
        res['triggered_from_month'] != null ? Number(res['triggered_from_month']) : null,
      file: res['file'] != null ? String(res['file']) : null,
      fileUrl: res['file_url'] ? String(res['file_url']) : '',
      status,
      errorMessage: res['error_message'] != null ? String(res['error_message']) : null,
      createdAt: String(res['created_at'] ?? ''),
      updatedAt: String(res['updated_at'] ?? ''),
      generatedBy: this.mapGeneratedBy(res['generated_by']),
      includedMonths: Array.isArray(included) ? included.map((m) => Number(m)) : [],
    };
  }

  private mapGeneratedBy(value: unknown): string | null {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if (obj['username'] != null) return String(obj['username']);
      if (obj['id'] != null) return String(obj['id']);
    }
    return String(value);
  }
}

export function isReportPending(report: Pick<GeneratedReport, 'status'>): boolean {
  const s = report.status.toLowerCase();
  return s === 'pending' || s === 'processing';
}

export function isReportReady(report: GeneratedReport): boolean {
  return report.status.toLowerCase() === 'completed' && !!report.fileUrl;
}

export function isReportFailed(report: GeneratedReport): boolean {
  return report.status.toLowerCase() === 'failed';
}
