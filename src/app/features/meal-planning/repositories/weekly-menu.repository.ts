import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../../../core/api/models';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import {
  CloneWeeklyMenuPayload,
  ShoppingList,
  WeeklyMenu,
  WeeklyMenuPayload,
} from '../models/meal-planning.models';
import {
  mapCloneWeeklyMenuPayloadToApi,
  mapShoppingListFromApi,
  mapWeeklyMenuFromApi,
  mapWeeklyMenuPayloadToApi,
} from '../mappers/meal-planning.mapper';

@Injectable({ providedIn: 'root' })
export class WeeklyMenuRepository {
  private readonly api = inject(ApiService);

  list(params?: Record<string, string | number | boolean>): Observable<WeeklyMenu[]> {
    return this.api
      .get<unknown[] | PaginatedResponse<unknown>>(API_ENDPOINTS.mealPlanning.weeklyMenus.list, { params })
      .pipe(
        map((response) => {
          const items = Array.isArray(response) ? response : (response.results ?? []);
          return items.map(mapWeeklyMenuFromApi);
        }),
      );
  }

  get(id: string): Observable<WeeklyMenu> {
    return this.api
      .get<unknown>(API_ENDPOINTS.mealPlanning.weeklyMenus.detail(id))
      .pipe(map(mapWeeklyMenuFromApi));
  }

  create(payload: WeeklyMenuPayload): Observable<WeeklyMenu> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.weeklyMenus.list, mapWeeklyMenuPayloadToApi(payload))
      .pipe(map(mapWeeklyMenuFromApi));
  }

  update(id: string, payload: WeeklyMenuPayload): Observable<WeeklyMenu> {
    return this.api
      .patch<unknown>(API_ENDPOINTS.mealPlanning.weeklyMenus.detail(id), mapWeeklyMenuPayloadToApi(payload))
      .pipe(map(mapWeeklyMenuFromApi));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.mealPlanning.weeklyMenus.detail(id));
  }

  toggleFavorite(id: string): Observable<WeeklyMenu> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.weeklyMenus.toggleFavorite(id), {})
      .pipe(map(mapWeeklyMenuFromApi));
  }

  current(): Observable<WeeklyMenu> {
    return this.api
      .get<unknown>(API_ENDPOINTS.mealPlanning.weeklyMenus.current)
      .pipe(map(mapWeeklyMenuFromApi));
  }

  setCurrent(id: string): Observable<WeeklyMenu> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.weeklyMenus.setCurrent(id), {})
      .pipe(map(mapWeeklyMenuFromApi));
  }

  favorites(): Observable<WeeklyMenu[]> {
    return this.api
      .get<unknown[] | PaginatedResponse<unknown>>(API_ENDPOINTS.mealPlanning.weeklyMenus.favorites)
      .pipe(
        map((response) => {
          const items = Array.isArray(response) ? response : (response.results ?? []);
          return items.map(mapWeeklyMenuFromApi);
        }),
      );
  }

  clone(id: string, payload: CloneWeeklyMenuPayload): Observable<WeeklyMenu> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.weeklyMenus.clone(id), mapCloneWeeklyMenuPayloadToApi(payload))
      .pipe(map(mapWeeklyMenuFromApi));
  }

  shoppingList(id: string): Observable<ShoppingList> {
    return this.api
      .get<unknown>(API_ENDPOINTS.mealPlanning.weeklyMenus.shoppingList(id))
      .pipe(map(mapShoppingListFromApi));
  }
}
