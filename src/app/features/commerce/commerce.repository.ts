import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';
import { Commerce } from '../../core/api/models';

@Injectable({
  providedIn: 'root'
})
export class CommerceRepository {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.API_BASE_URL}commerces/`;

  list(): Observable<Commerce[]> {
    const apiBase = environment.API_BASE_URL.replace('/api/', '');
    return this.http.get<any[]>(this.baseUrl).pipe(
      map((items) =>
        items.map((c) => ({
          id: c.id,
          name: c.name,
          logo: c.logo ? (c.logo.startsWith('http') ? c.logo : `${apiBase}${c.logo}`) : null,
          currencyCode: c.currency_code,
        })),
      ),
    );
  }
}
