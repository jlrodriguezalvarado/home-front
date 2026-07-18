import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS } from '../../core/api/endpoints';

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: string;
  effective_date: string;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ExchangeRepository {
  private readonly api = inject(ApiService);

  list(): Observable<ExchangeRate[]> {
    return this.api.get<ExchangeRate[]>(API_ENDPOINTS.exchangeRates.list);
  }

  create(data: {
    from_currency: string;
    to_currency: string;
    rate: string;
    effective_date: string;
    is_active: boolean;
  }): Observable<ExchangeRate> {
    return this.api.post<ExchangeRate>(API_ENDPOINTS.exchangeRates.list, data);
  }

  update(id: string, data: Partial<ExchangeRate>): Observable<ExchangeRate> {
    return this.api.patch<ExchangeRate>(API_ENDPOINTS.exchangeRates.detail(id), data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.exchangeRates.detail(id));
  }

  /** Latest active rate per currency pair (client-side). */
  getLatestActive(rates: ExchangeRate[]): ExchangeRate[] {
    const byPair = new Map<string, ExchangeRate>();

    for (const rate of rates.filter((r) => r.is_active)) {
      const key = `${rate.from_currency}:${rate.to_currency}`;
      const existing = byPair.get(key);
      if (!existing || rate.effective_date > existing.effective_date) {
        byPair.set(key, rate);
      }
    }

    return Array.from(byPair.values());
  }

  /** Filter rates by YYYY-MM month prefix on effective_date. */
  filterByMonth(rates: ExchangeRate[], month: string): ExchangeRate[] {
    return rates.filter((r) => r.effective_date.startsWith(month));
  }
}
