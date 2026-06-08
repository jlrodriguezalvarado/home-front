import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../../core/api/models';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS } from '../../core/api/endpoints';

export interface Purchase {
  id: string;
  date: string;
  total: string;
  commerceName: string;
  items: any[];
  isFavorite: boolean;
  favoriteName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PurchaseRepository {
  private readonly api = inject(ApiService);

  list(page = 1, favorite?: boolean): Observable<PaginatedResponse<Purchase>> {
    let params = new HttpParams().set('page', page.toString());
    if (favorite) params = params.set('favorite', 'true');

    return this.api.get<any>(API_ENDPOINTS.purchases.list, { params }).pipe(
      map((resp) => ({
        ...resp,
        results: resp.results.map((p: any) => this.mapPurchase(p)),
      })),
    );
  }

  create(data: unknown): Observable<Purchase> {
    return this.api.post<any>(API_ENDPOINTS.purchases.list, data).pipe(
      map((p) => this.mapPurchase(p)),
    );
  }

  updateFavorite(id: string, isFavorite: boolean, favoriteName = ''): Observable<Purchase> {
    return this.api
      .patch<any>(API_ENDPOINTS.purchases.detail(id), {
        is_favorite: isFavorite,
        favorite_name: favoriteName,
      })
      .pipe(map((p) => this.mapPurchase(p)));
  }

  private mapPurchase(p: any): Purchase {
    return {
      id: p.id,
      date: p.date,
      total: p.total,
      commerceName: p.commerce_name,
      items: p.items,
      isFavorite: p.is_favorite,
      favoriteName: p.favorite_name,
    };
  }
}
