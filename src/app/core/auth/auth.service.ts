import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap, catchError, throwError, of } from 'rxjs';

export interface AuthTokens {
  access: string;
  refresh: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  private _accessToken = signal<string | null>(localStorage.getItem(this.ACCESS_TOKEN_KEY));
  private _refreshToken = signal<string | null>(localStorage.getItem(this.REFRESH_TOKEN_KEY));

  isAuthenticated = computed(() => !!this._accessToken());

  constructor(private http: HttpClient) {}

  getAccessToken(): string | null {
    return this._accessToken();
  }

  getRefreshToken(): string | null {
    return this._refreshToken();
  }

  login(credentials: any): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${environment.API_BASE_URL}auth/login/`, credentials).pipe(
      tap(tokens => this.saveTokens(tokens))
    );
  }

  refreshToken(): Observable<AuthTokens> {
    const refresh = this.getRefreshToken();
    if (!refresh) return throwError(() => new Error('No refresh token available'));

    return this.http.post<AuthTokens>(`${environment.API_BASE_URL}auth/refresh/`, { refresh }).pipe(
      tap(tokens => {
        this.saveTokens({ ...tokens, refresh }); // DRF might not return a new refresh token
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  logout() {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  private saveTokens(tokens: AuthTokens) {
    this._accessToken.set(tokens.access);
    this._refreshToken.set(tokens.refresh);
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.access);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh);
  }
}
