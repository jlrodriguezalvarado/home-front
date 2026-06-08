import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Commerce, PaginatedResponse } from '../../core/api/models';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS } from '../../core/api/endpoints';
import { resolveMediaUrl } from '../../core/api/api-url';

@Injectable({
  providedIn: 'root',
})
export class CommerceRepository {
  private readonly api = inject(ApiService);

  list(): Observable<Commerce[]> {
    return this.api.get<any[] | PaginatedResponse<any>>(API_ENDPOINTS.commerces.list).pipe(
      map((res) => {
        const items = Array.isArray(res) ? res : (res.results ?? []);
        return items.map((c) => ({
          id: c.id,
          name: c.name,
          logo: resolveMediaUrl(c.logo),
          currencyCode: c.currency_code,
        }));
      }),
    );
  }
}
