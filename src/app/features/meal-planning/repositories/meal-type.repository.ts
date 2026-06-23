import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../../../core/api/models';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { MealType, MealTypePayload } from '../models/meal-planning.models';
import { mapMealTypeFromApi, mapMealTypePayloadToApi } from '../mappers/meal-planning.mapper';

@Injectable({ providedIn: 'root' })
export class MealTypeRepository {
  private readonly api = inject(ApiService);

  list(params?: Record<string, string | number | boolean>): Observable<MealType[]> {
    return this.api
      .get<unknown[] | PaginatedResponse<unknown>>(API_ENDPOINTS.mealPlanning.mealTypes.list, { params })
      .pipe(
        map((response) => {
          const items = Array.isArray(response) ? response : (response.results ?? []);
          return items.map(mapMealTypeFromApi).sort((a, b) => a.sortOrder - b.sortOrder);
        }),
      );
  }

  get(id: string): Observable<MealType> {
    return this.api
      .get<unknown>(API_ENDPOINTS.mealPlanning.mealTypes.detail(id))
      .pipe(map(mapMealTypeFromApi));
  }

  create(payload: MealTypePayload): Observable<MealType> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.mealTypes.list, mapMealTypePayloadToApi(payload))
      .pipe(map(mapMealTypeFromApi));
  }

  update(id: string, payload: MealTypePayload): Observable<MealType> {
    return this.api
      .patch<unknown>(API_ENDPOINTS.mealPlanning.mealTypes.detail(id), mapMealTypePayloadToApi(payload))
      .pipe(map(mapMealTypeFromApi));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.mealPlanning.mealTypes.detail(id));
  }
}
