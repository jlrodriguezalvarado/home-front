import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { SavingsAccountType, SavingsAccountTypeWrite } from '../models/finance.models';
import { decodeApiList, foreignKeyId } from './finance-api.utils';

export interface SavingsAccountTypeListOptions {
  isActive?: boolean;
  page?: number;
  perPage?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SavingsAccountTypeService {
  private readonly api = inject(ApiService);

  list(options: SavingsAccountTypeListOptions = {}): Observable<SavingsAccountType[]> {
    const params: Record<string, string | number> = {
      perPage: options.perPage ?? 200,
    };
    if (options.page != null) params['page'] = options.page;
    return this.api.get<unknown>(API_ENDPOINTS.finance.savingsAccountTypes, { params }).pipe(
      map((res) => {
        let items = decodeApiList<Record<string, unknown>>(res).map((item) => this.mapType(item));
        if (options.isActive != null) {
          items = items.filter((item) => item.isActive === options.isActive);
        }
        return items.sort((a, b) => a.name.localeCompare(b.name));
      }),
    );
  }

  getById(id: string): Observable<SavingsAccountType> {
    return this.api
      .get<Record<string, unknown>>(`${API_ENDPOINTS.finance.savingsAccountTypes}${id}/`)
      .pipe(map((res) => this.mapType(res)));
  }

  create(data: SavingsAccountTypeWrite): Observable<SavingsAccountType> {
    return this.api
      .post<Record<string, unknown>>(API_ENDPOINTS.finance.savingsAccountTypes, this.toPayload(data))
      .pipe(map((res) => this.mapType(res)));
  }

  update(id: string, data: SavingsAccountTypeWrite): Observable<SavingsAccountType> {
    return this.api
      .patch<Record<string, unknown>>(`${API_ENDPOINTS.finance.savingsAccountTypes}${id}/`, this.toPayload(data))
      .pipe(map((res) => this.mapType(res)));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`${API_ENDPOINTS.finance.savingsAccountTypes}${id}/`);
  }

  private mapType(raw: Record<string, unknown>): SavingsAccountType {
    return {
      id: String(raw['id'] ?? ''),
      name: String(raw['name'] ?? ''),
      currencyId: foreignKeyId(raw['currency']),
      isActive: raw['is_active'] !== false,
      createdAt: raw['created_at'] ? String(raw['created_at']) : undefined,
      updatedAt: raw['updated_at'] ? String(raw['updated_at']) : undefined,
    };
  }

  private toPayload(data: SavingsAccountTypeWrite): Record<string, unknown> {
    return {
      name: data.name.trim(),
      currency: data.currencyId,
      is_active: data.isActive,
    };
  }
}
