import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../../../core/api/models';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { Ingredient, IngredientFormValue } from '../models/meal-planning.models';
import { mapIngredientFromApi, mapIngredientToApi } from '../mappers/meal-planning.mapper';

@Injectable({ providedIn: 'root' })
export class IngredientRepository {
  private readonly api = inject(ApiService);

  list(params?: Record<string, string | number | boolean>): Observable<Ingredient[]> {
    return this.api
      .get<unknown[] | PaginatedResponse<unknown>>(API_ENDPOINTS.mealPlanning.ingredients.list, { params })
      .pipe(
        map((response) => {
          const items = Array.isArray(response) ? response : (response.results ?? []);
          return items.map(mapIngredientFromApi);
        }),
      );
  }

  get(id: string): Observable<Ingredient> {
    return this.api
      .get<unknown>(API_ENDPOINTS.mealPlanning.ingredients.detail(id))
      .pipe(map(mapIngredientFromApi));
  }

  create(payload: IngredientFormValue): Observable<Ingredient> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.ingredients.list, mapIngredientToApi(payload))
      .pipe(map(mapIngredientFromApi));
  }

  update(id: string, payload: IngredientFormValue): Observable<Ingredient> {
    return this.api
      .patch<unknown>(API_ENDPOINTS.mealPlanning.ingredients.detail(id), mapIngredientToApi(payload))
      .pipe(map(mapIngredientFromApi));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.mealPlanning.ingredients.detail(id));
  }
}
