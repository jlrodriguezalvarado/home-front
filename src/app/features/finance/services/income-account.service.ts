import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { IncomeAccount, IncomeAccountWrite } from '../models/finance.models';
import { decodeApiList, foreignKeyId } from './finance-api.utils';

export interface IncomeAccountListOptions {
  currencyId?: string;
  isActive?: boolean;
  ordering?: string;
  page?: number;
  perPage?: number;
}

@Injectable({
  providedIn: 'root',
})
export class IncomeAccountService {
  private readonly api = inject(ApiService);

  list(options: IncomeAccountListOptions = {}): Observable<IncomeAccount[]> {
    const params: Record<string, string | number | boolean> = {
      ordering: options.ordering ?? 'name',
      perPage: options.perPage ?? 200,
    };
    if (options.currencyId) params['currency'] = options.currencyId;
    if (options.isActive != null) params['is_active'] = options.isActive;
    if (options.page != null) params['page'] = options.page;
    return this.api
      .get<unknown>(API_ENDPOINTS.finance.incomeAccounts, { params })
      .pipe(map((res) => decodeApiList<Record<string, unknown>>(res).map((item) => this.mapAccount(item))));
  }

  getById(id: string): Observable<IncomeAccount> {
    return this.api
      .get<Record<string, unknown>>(`${API_ENDPOINTS.finance.incomeAccounts}${id}/`)
      .pipe(map((res) => this.mapAccount(res)));
  }

  create(data: IncomeAccountWrite): Observable<IncomeAccount> {
    return this.api
      .post<Record<string, unknown>>(API_ENDPOINTS.finance.incomeAccounts, this.toPayload(data))
      .pipe(map((res) => this.mapAccount(res)));
  }

  update(id: string, data: IncomeAccountWrite): Observable<IncomeAccount> {
    return this.api
      .patch<Record<string, unknown>>(`${API_ENDPOINTS.finance.incomeAccounts}${id}/`, this.toPayload(data))
      .pipe(map((res) => this.mapAccount(res)));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`${API_ENDPOINTS.finance.incomeAccounts}${id}/`);
  }

  private mapAccount(raw: Record<string, unknown>): IncomeAccount {
    return {
      id: String(raw['id'] ?? ''),
      name: String(raw['name'] ?? ''),
      currencyId: foreignKeyId(raw['currency']),
      isActive: raw['is_active'] !== false,
      createdAt: raw['created_at'] ? String(raw['created_at']) : undefined,
      updatedAt: raw['updated_at'] ? String(raw['updated_at']) : undefined,
    };
  }

  private toPayload(data: IncomeAccountWrite): Record<string, unknown> {
    return {
      name: data.name.trim(),
      currency: data.currencyId,
      is_active: data.isActive,
    };
  }
}
