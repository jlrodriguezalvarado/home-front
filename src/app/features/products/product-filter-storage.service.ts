import { Injectable } from '@angular/core';

const FILTERS_KEY = 'products_list_filters_v1';

export interface ProductListFilters {
  commerceId: string | null;
  categoryId: string | null;
  search: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProductFilterStorageService {
  load(): ProductListFilters | null {
    try {
      const raw = localStorage.getItem(FILTERS_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as Partial<ProductListFilters>;
      return {
        commerceId: typeof parsed.commerceId === 'string' ? parsed.commerceId : null,
        categoryId: typeof parsed.categoryId === 'string' ? parsed.categoryId : null,
        search: typeof parsed.search === 'string' ? parsed.search : '',
      };
    } catch {
      return null;
    }
  }

  save(filters: ProductListFilters): void {
    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  }
}
