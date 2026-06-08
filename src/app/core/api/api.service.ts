import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from './api-url';

type HttpOptions = {
  params?: HttpParams | Record<string, string | number | boolean>;
};

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, options?: HttpOptions): Observable<T> {
    return this.http.get<T>(apiUrl(path), options);
  }

  post<T>(path: string, body?: unknown, options?: HttpOptions): Observable<T> {
    return this.http.post<T>(apiUrl(path), body, options);
  }

  patch<T>(path: string, body?: unknown, options?: HttpOptions): Observable<T> {
    return this.http.patch<T>(apiUrl(path), body, options);
  }

  delete<T>(path: string, options?: HttpOptions): Observable<T> {
    return this.http.delete<T>(apiUrl(path), options);
  }
}
