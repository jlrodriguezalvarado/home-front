import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { NotificationsService } from './notifications.service';
import { NotificationsWebSocketService } from './notifications-websocket.service';

@Injectable({ providedIn: 'root' })
export class NotificationsSessionService {
  private readonly auth = inject(AuthService);
  private readonly notificationsWs = inject(NotificationsWebSocketService);
  private readonly notifications = inject(NotificationsService);
  private started = false;

  start(): void {
    if (!this.auth.isAuthenticated() || this.started) return;
    this.started = true;
    this.notifications.initialize();
    this.notificationsWs.connect();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.notificationsWs.disconnect();
    this.notifications.reset();
  }
}
