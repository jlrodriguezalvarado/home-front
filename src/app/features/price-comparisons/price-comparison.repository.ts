import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS } from '../../core/api/endpoints';
import { mapCategory, mapComparison, mapList, mapPrice, mapProduct, mapReport, mapStore } from './price-comparison.mapper';
import { CategoryPayload, ComparisonCategory, ComparisonPayload, ComparisonPrice, ComparisonProduct, ComparisonStore, PriceComparison, PriceComparisonReport, PricePayload, ProductPayload, StorePayload } from './price-comparison.models';
@Injectable({ providedIn: 'root' })
export class PriceComparisonRepository {
  private readonly api = inject(ApiService);
  listComparisons(): Observable<PriceComparison[]> {
    return this.api.get<unknown>(API_ENDPOINTS.priceComparisons.comparisons.list).pipe(map((response) => mapList(response, mapComparison)));
  }
  createComparison(payload: ComparisonPayload): Observable<PriceComparison> {
    return this.api.post<unknown>(API_ENDPOINTS.priceComparisons.comparisons.list, payload).pipe(map(mapComparison));
  }
  updateComparison(id: string, payload: Partial<ComparisonPayload>): Observable<PriceComparison> {
    return this.api.patch<unknown>(API_ENDPOINTS.priceComparisons.comparisons.detail(id), payload).pipe(map(mapComparison));
  }
  deleteComparison(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.priceComparisons.comparisons.detail(id));
  }
  listStores(comparison: string): Observable<ComparisonStore[]> {
    return this.api.get<unknown>(API_ENDPOINTS.priceComparisons.stores.list, { params: { comparison } }).pipe(map((response) => mapList(response, mapStore)));
  }
  createStore(payload: StorePayload): Observable<ComparisonStore> {
    return this.api.post<unknown>(API_ENDPOINTS.priceComparisons.stores.list, payload).pipe(map(mapStore));
  }
  updateStore(id: string, payload: Partial<StorePayload>): Observable<ComparisonStore> {
    return this.api.patch<unknown>(API_ENDPOINTS.priceComparisons.stores.detail(id), payload).pipe(map(mapStore));
  }
  deleteStore(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.priceComparisons.stores.detail(id));
  }
  listCategories(comparison: string): Observable<ComparisonCategory[]> {
    return this.api.get<unknown>(API_ENDPOINTS.priceComparisons.categories.list, { params: { comparison } }).pipe(map((response) => mapList(response, mapCategory)));
  }
  createCategory(payload: CategoryPayload): Observable<ComparisonCategory> {
    return this.api.post<unknown>(API_ENDPOINTS.priceComparisons.categories.list, payload).pipe(map(mapCategory));
  }
  updateCategory(id: string, payload: Partial<CategoryPayload>): Observable<ComparisonCategory> {
    return this.api.patch<unknown>(API_ENDPOINTS.priceComparisons.categories.detail(id), payload).pipe(map(mapCategory));
  }
  deleteCategory(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.priceComparisons.categories.detail(id));
  }
  listProducts(comparison: string): Observable<ComparisonProduct[]> {
    return this.api.get<unknown>(API_ENDPOINTS.priceComparisons.products.list, { params: { comparison } }).pipe(map((response) => mapList(response, mapProduct)));
  }
  createProduct(payload: ProductPayload): Observable<ComparisonProduct> {
    return this.api.post<unknown>(API_ENDPOINTS.priceComparisons.products.list, payload).pipe(map(mapProduct));
  }
  updateProduct(id: string, payload: Partial<ProductPayload>): Observable<ComparisonProduct> {
    return this.api.patch<unknown>(API_ENDPOINTS.priceComparisons.products.detail(id), payload).pipe(map(mapProduct));
  }
  deleteProduct(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.priceComparisons.products.detail(id));
  }
  listPrices(comparison: string): Observable<ComparisonPrice[]> {
    return this.api.get<unknown>(API_ENDPOINTS.priceComparisons.prices.list, { params: { comparison } }).pipe(map((response) => mapList(response, mapPrice)));
  }
  createPrice(payload: PricePayload): Observable<ComparisonPrice> {
    return this.api.post<unknown>(API_ENDPOINTS.priceComparisons.prices.list, payload).pipe(map(mapPrice));
  }
  updatePrice(id: string, payload: Pick<PricePayload, 'price'>): Observable<ComparisonPrice> {
    return this.api.patch<unknown>(API_ENDPOINTS.priceComparisons.prices.detail(id), payload).pipe(map(mapPrice));
  }
  deletePrice(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.priceComparisons.prices.detail(id));
  }
  getReport(comparisonId: string): Observable<PriceComparisonReport> {
    return this.api.get<unknown>(API_ENDPOINTS.priceComparisons.comparisons.report(comparisonId)).pipe(map(mapReport));
  }
}
