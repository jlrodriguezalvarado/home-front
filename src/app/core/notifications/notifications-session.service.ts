import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth/auth.service';
import { NotificationsService } from './notifications.service';
import { NotificationsWebSocketService } from './notifications-websocket.service';

@Injectable({ providedIn: 'root' })
export class NotificationsSessionService {
  private readonly auth = inject(AuthService);
  private readonly notificationsWs = inject(NotificationsWebSocketService);
  private readonly notifications = inject(NotificationsService);
  private started = false;

  constructor() {
    this.auth.loggedOut$
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.stop());
  }

  start(): void {
    if (!this.auth.isAuthenticated() || this.started) return;
    this.started = true;
    this.notifications.initialize();
    this.notificationsWs.connect();
  }

  stop(): void {
    this.started = false;
    this.notificationsWs.disconnect();
    this.notifications.reset();
  }
}
