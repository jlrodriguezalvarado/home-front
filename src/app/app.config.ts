import {
  ApplicationConfig,
  provideAppInitializer,
  provideZoneChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/api/auth.interceptor';
import { appErrorInterceptor } from './core/api/app-error.interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { initCart } from './features/shopping/cart.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withXhr(), withInterceptors([appErrorInterceptor, authInterceptor])),
    provideAppInitializer(initCart),
    provideServiceWorker('sw.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:5000',
    }),
  ],
};
