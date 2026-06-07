import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../../core/api/models';

export interface Purchase {
  id: string;
  date: string;
  total: string;
  commerceName: string;
  items: any[];
  isFavorite: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PurchaseRepository {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.API_BASE_URL}purchases/`;

  list(page: number = 1): Observable<PaginatedResponse<Purchase>> {
    return this.http.get<any>(this.baseUrl, { params: { page: page.toString() } }).pipe(
      map(resp => ({
        ...resp,
        results: resp.results.map((p: any) => ({
          id: p.id,
          date: p.date,
          total: p.total,
          commerceName: p.commerce_name,
          items: p.items,
          isFavorite: p.is_favorite
        }))
      }))
    );
  }

  create(data: any): Observable<Purchase> {
    return this.http.post<any>(this.baseUrl, data);
  }

  toggleFavorite(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}${id}/favorite/`, {});
  }
}
