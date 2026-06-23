import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../../../core/api/models';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { Recipe, RecipePayload } from '../models/meal-planning.models';
import { mapRecipeFromApi, mapRecipePayloadToApi } from '../mappers/meal-planning.mapper';

@Injectable({ providedIn: 'root' })
export class RecipeRepository {
  private readonly api = inject(ApiService);

  list(params?: Record<string, string | number | boolean>): Observable<Recipe[]> {
    return this.api
      .get<unknown[] | PaginatedResponse<unknown>>(API_ENDPOINTS.mealPlanning.recipes.list, { params })
      .pipe(
        map((response) => {
          const items = Array.isArray(response) ? response : (response.results ?? []);
          return items.map(mapRecipeFromApi);
        }),
      );
  }

  get(id: string): Observable<Recipe> {
    return this.api
      .get<unknown>(API_ENDPOINTS.mealPlanning.recipes.detail(id))
      .pipe(map(mapRecipeFromApi));
  }

  create(payload: RecipePayload): Observable<Recipe> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.recipes.list, mapRecipePayloadToApi(payload))
      .pipe(map(mapRecipeFromApi));
  }

  update(id: string, payload: RecipePayload): Observable<Recipe> {
    return this.api
      .patch<unknown>(API_ENDPOINTS.mealPlanning.recipes.detail(id), mapRecipePayloadToApi(payload))
      .pipe(map(mapRecipeFromApi));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.mealPlanning.recipes.detail(id));
  }

  toggleFavorite(id: string): Observable<Recipe> {
    return this.api
      .post<unknown>(API_ENDPOINTS.mealPlanning.recipes.toggleFavorite(id), {})
      .pipe(map(mapRecipeFromApi));
  }

  favorites(): Observable<Recipe[]> {
    return this.api
      .get<unknown[] | PaginatedResponse<unknown>>(API_ENDPOINTS.mealPlanning.recipes.favorites)
      .pipe(
        map((response) => {
          const items = Array.isArray(response) ? response : (response.results ?? []);
          return items.map(mapRecipeFromApi);
        }),
      );
  }
}
