import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideZoneChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/api/auth.interceptor';
import { appErrorInterceptor } from './core/api/app-error.interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { CartService, initCart } from './features/shopping/cart.service';
import { CartStorageService } from './features/shopping/cart-storage.service';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([appErrorInterceptor, authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initCart,
      deps: [CartService, CartStorageService, AuthService],
      multi: true,
    },
    provideServiceWorker('sw.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:5000',
    }),
  ],
};
