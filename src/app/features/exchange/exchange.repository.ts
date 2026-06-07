import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: string;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExchangeRepository {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.API_BASE_URL}exchange-rates/`;

  latest(): Observable<ExchangeRate[]> {
    return this.http.get<ExchangeRate[]>(`${this.baseUrl}latest/`);
  }

  history(month: string): Observable<ExchangeRate[]> {
    return this.http.get<ExchangeRate[]>(`${this.baseUrl}history/`, { params: { month } });
  }

  save(data: any): Observable<ExchangeRate> {
    return this.http.post<ExchangeRate>(this.baseUrl, data);
  }
}
