import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { ApiService } from '../api/api.service';
import { API_ENDPOINTS } from '../api/endpoints';

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthUser {
  id: string;
  email: string;
  [key: string]: unknown;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordResponse {
  detail: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  private _accessToken = signal<string | null>(localStorage.getItem(this.ACCESS_TOKEN_KEY));
  private _refreshToken = signal<string | null>(localStorage.getItem(this.REFRESH_TOKEN_KEY));

  isAuthenticated = computed(() => !!this._accessToken());

  getAccessToken(): string | null {
    return this._accessToken();
  }

  getRefreshToken(): string | null {
    return this._refreshToken();
  }

  login(credentials: { email: string; password: string }): Observable<AuthTokens> {
    return this.api.post<AuthTokens>(API_ENDPOINTS.auth.login, credentials).pipe(
      tap((tokens) => this.saveTokens(tokens)),
    );
  }

  refreshToken(): Observable<AuthTokens> {
    const refresh = this.getRefreshToken();
    if (!refresh) return throwError(() => new Error('No refresh token available'));

    return this.api.post<AuthTokens>(API_ENDPOINTS.auth.refresh, { refresh }).pipe(
      tap((tokens) => {
        this.saveTokens({ ...tokens, refresh });
      }),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      }),
    );
  }

  getCurrentUser(): Observable<AuthUser> {
    return this.api.get<AuthUser>(API_ENDPOINTS.auth.me);
  }

  changePassword(payload: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    return this.api.post<ChangePasswordResponse>(API_ENDPOINTS.auth.changePassword, payload);
  }

  logout() {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  private saveTokens(tokens: AuthTokens) {
    this._accessToken.set(tokens.access);
    this._refreshToken.set(tokens.refresh);
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.access);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh);
  }
}
