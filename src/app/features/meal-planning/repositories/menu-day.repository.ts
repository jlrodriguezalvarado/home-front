import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../../../core/api/models';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { CopyFavoriteDayPayload, MenuDay } from '../models/meal-planning.models';
import { mapCopyFavoriteDayPayloadToApi, mapMenuDayFromApi } from '../mappers/meal-planning.mapper';

@Injectable({ providedIn: 'root' })
export class MenuDayRepository {
  private readonly api = inject(ApiService);

  toggleFavorite(id: string): Observable<MenuDay> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.menuDays.toggleFavorite(id), {})
      .pipe(map(mapMenuDayFromApi));
  }

  favorites(): Observable<MenuDay[]> {
    return this.api
      .get<unknown[] | PaginatedResponse<unknown>>(API_ENDPOINTS.mealPlanning.menuDays.favorites)
      .pipe(
        map((response) => {
          const items = Array.isArray(response) ? response : (response.results ?? []);
          return items.map(mapMenuDayFromApi);
        }),
      );
  }

  copyFavorite(payload: CopyFavoriteDayPayload): Observable<MenuDay> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.menuDays.copyFavorite, mapCopyFavoriteDayPayloadToApi(payload))
      .pipe(map(mapMenuDayFromApi));
  }
}
