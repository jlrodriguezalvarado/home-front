import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../../../core/api/models';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { CopyFavoriteMealPayload, MenuMeal, MenuMealPayload } from '../models/meal-planning.models';
import {
  mapCopyFavoriteMealPayloadToApi,
  mapMenuMealFromApi,
  mapMenuMealPayloadToApi,
} from '../mappers/meal-planning.mapper';

@Injectable({ providedIn: 'root' })
export class MenuMealRepository {
  private readonly api = inject(ApiService);

  create(payload: MenuMealPayload): Observable<MenuMeal> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.menuMeals.list, mapMenuMealPayloadToApi(payload))
      .pipe(map(mapMenuMealFromApi));
  }

  update(id: string, payload: MenuMealPayload): Observable<MenuMeal> {
    return this.api
      .patch<unknown>(API_ENDPOINTS.mealPlanning.menuMeals.detail(id), mapMenuMealPayloadToApi(payload))
      .pipe(map(mapMenuMealFromApi));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.mealPlanning.menuMeals.detail(id));
  }

  toggleFavorite(id: string): Observable<MenuMeal> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.menuMeals.toggleFavorite(id), {})
      .pipe(map(mapMenuMealFromApi));
  }

  favorites(): Observable<MenuMeal[]> {
    return this.api
      .get<unknown[] | PaginatedResponse<unknown>>(API_ENDPOINTS.mealPlanning.menuMeals.favorites)
      .pipe(
        map((response) => {
          const items = Array.isArray(response) ? response : (response.results ?? []);
          return items.map(mapMenuMealFromApi);
        }),
      );
  }

  copyFavorite(payload: CopyFavoriteMealPayload): Observable<MenuMeal> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.menuMeals.copyFavorite, mapCopyFavoriteMealPayloadToApi(payload))
      .pipe(map(mapMenuMealFromApi));
  }
}
