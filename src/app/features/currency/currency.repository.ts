import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Currency, PaginatedResponse } from '../../core/api/models';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS } from '../../core/api/endpoints';

@Injectable({
  providedIn: 'root',
})
export class CurrencyRepository {
  private readonly api = inject(ApiService);

  list(): Observable<Currency[]> {
    return this.api.get<Currency[] | PaginatedResponse<Currency>>(API_ENDPOINTS.currencies.list).pipe(
      map((res) => (Array.isArray(res) ? res : (res.results ?? []))),
    );
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
