import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Currency } from './currency.models';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS } from '../../core/api/endpoints';
import { ApiListResponse, apiListResults } from '../../core/api/api-page';

@Injectable({
  providedIn: 'root',
})
export class CurrencyRepository {
  private readonly api = inject(ApiService);

  list(): Observable<Currency[]> {
    return this.api
      .get<ApiListResponse<Currency>>(API_ENDPOINTS.currencies.list)
      .pipe(map(apiListResults));
  }

  create(data: Omit<Currency, 'id'>): Observable<Currency> {
    return this.api.post<Currency>(API_ENDPOINTS.currencies.list, data);
  }

  update(id: string, data: Partial<Currency>): Observable<Currency> {
    return this.api.patch<Currency>(API_ENDPOINTS.currencies.detail(id), data);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.currencies.detail(id));
  }
}
