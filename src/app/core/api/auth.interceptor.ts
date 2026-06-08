import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

function isPublicAuthRequest(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/refresh');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();
  const skipAuth = isPublicAuthRequest(req.url);

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
            authService.logout();
            return throwError(() => err);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
