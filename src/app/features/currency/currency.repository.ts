import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyRepository {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.API_BASE_URL}currencies/`;

  list(): Observable<Currency[]> {
    return this.http.get<Currency[]>(this.baseUrl);
  }

  create(data: Currency): Observable<Currency> {
    return this.http.post<Currency>(this.baseUrl, data);
  }

  update(code: string, data: Partial<Currency>): Observable<Currency> {
    return this.http.patch<Currency>(`${this.baseUrl}${code}/`, data);
  }

  delete(code: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${code}/`);
  }
}
