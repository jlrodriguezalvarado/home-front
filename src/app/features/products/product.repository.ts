import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';
import { PaginatedResponse, Product, Category } from '../../core/api/models';

@Injectable({
  providedIn: 'root'
})
export class ProductRepository {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.API_BASE_URL}products/`;

  list(params: { search?: string, commerce?: string, category?: string, page?: number, perPage?: number }): Observable<PaginatedResponse<Product>> {
    let httpParams = new HttpParams();
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.commerce) httpParams = httpParams.set('commerce', params.commerce);
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.perPage) httpParams = httpParams.set('perPage', params.perPage.toString());

    return this.http.get<any>(this.baseUrl, { params: httpParams }).pipe(
      map(resp => ({
        ...resp,
        results: resp.results.map((p: any) => this.mapProduct(p))
      }))
    );
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${environment.API_BASE_URL}categories/`);
  }

  update(id: string, data: Partial<Product>): Observable<Product> {
    return this.http.patch<any>(`${this.baseUrl}${id}/`, data).pipe(
      map((p) => this.mapProduct(p)),
    );
  }

  updatePrices(productIds: string[]): Observable<Product[]> {
    return this.http.post<any[]>(`${this.baseUrl}update-prices/`, { product_ids: productIds }).pipe(
      map((items) => items.map((p) => this.mapProduct(p))),
    );
  }

  private mapProduct(p: any): Product {
    const apiBase = environment.API_BASE_URL.replace('/api/', '');
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image ? (p.image.startsWith('http') ? p.image : `${apiBase}${p.image}`) : null,
      unit: p.unit,
      commerce: {
        id: p.commerce.id,
        name: p.commerce.name,
        logo: p.commerce.logo
          ? p.commerce.logo.startsWith('http')
            ? p.commerce.logo
            : `${apiBase}${p.commerce.logo}`
          : null,
        currencyCode: p.commerce.currency_code,
      },
      category: p.category
        ? {
            id: p.category.id,
            name: p.category.name,
          }
        : null,
    };
  }
}
