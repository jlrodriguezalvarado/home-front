import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

function isPublicAuthRequest(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/refresh');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const accessToken = authService.getAccessToken();
  const skipAuth = isPublicAuthRequest(req.url);
  const clearSessionAndRedirect = () => {
    authService.logout();
    router.navigate(['/login']);
  };

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (!skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (!(req.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const authReq = req.clone({ setHeaders: headers });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublicAuthRequest(req.url)) {
        return authService.refreshToken().pipe(
          switchMap((tokens) => {
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${tokens.access}`,
              },
            });
            return next(retryReq);
          }),
          catchError((err) => {
            clearSessionAndRedirect();
            return throwError(() => err);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
