import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { AppCurrency } from '../models/finance.models';
import { decodeApiList } from './finance-api.utils';

@Injectable({
  providedIn: 'root',
})
export class CurrencyCacheService {
  private readonly api = inject(ApiService);
  private readonly currencies = signal<AppCurrency[] | null>(null);

  load(force = false): Observable<AppCurrency[]> {
    const cached = this.currencies();
    if (!force && cached) return of(cached);
    return this.api.get<unknown>(API_ENDPOINTS.currencies.list, { params: { perPage: '200' } }).pipe(
      map((res) => decodeApiList<Record<string, unknown>>(res).map((item) => this.mapCurrency(item))),
      tap((list) => this.currencies.set(list)),
    );
  }

  snapshot(): AppCurrency[] {
    return this.currencies() ?? [];
  }

  labelFor(currencyId: string): string {
    const match = this.snapshot().find((c) => c.id === currencyId);
    if (!match) return currencyId;
    return `${match.code} (${match.symbol})`;
  }

  invalidate(): void {
    this.currencies.set(null);
  }

  private mapCurrency(raw: Record<string, unknown>): AppCurrency {
    return {
      id: String(raw['id'] ?? ''),
      code: String(raw['code'] ?? ''),
      name: String(raw['name'] ?? ''),
      symbol: String(raw['symbol'] ?? ''),
      isActive: raw['is_active'] !== false && raw['active'] !== false,
    };
  }
}
