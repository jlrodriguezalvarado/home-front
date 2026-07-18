import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import {
  AppNotification,
  CommerceReprocessFinishedEvent,
} from './notifications.models';
import { isNotificationApi, mapNotificationFromApi, parseNotificationApi } from './notifications.mapper';

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const TOKEN_EXPIRED_CLOSE_CODE = 4001;

@Injectable({ providedIn: 'root' })
export class NotificationsWebSocketService {
  private readonly auth = inject(AuthService);
  private readonly notificationCreatedSubject = new Subject<AppNotification>();
  private readonly notificationUpdatedSubject = new Subject<AppNotification>();
  private readonly commerceReprocessSubject = new Subject<CommerceReprocessFinishedEvent>();
  readonly notificationCreated$: Observable<AppNotification> = this.notificationCreatedSubject.asObservable();
  readonly notificationUpdated$: Observable<AppNotification> = this.notificationUpdatedSubject.asObservable();
  readonly commerceReprocessFinished$: Observable<CommerceReprocessFinishedEvent> =
    this.commerceReprocessSubject.asObservable();
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;
  connected = signal(false);
  connecting = signal(false);
  lastError = signal<string | null>(null);

  connect(): void {
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this.clearReconnectTimer();
    this.openSocket();
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected.set(false);
    this.connecting.set(false);
  }

  private openSocket(): void {
    const token = this.auth.getAccessToken();
    if (!token) {
      this.lastError.set('Not authenticated');
      return;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connecting.set(true);
    this.lastError.set(null);
    const wsBase = environment.wsUrl.replace(/\/$/, '');
    const url = `${wsBase}/notifications/?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.onopen = () => {
      this.connected.set(true);
      this.connecting.set(false);
      this.reconnectAttempts = 0;
    };
    socket.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    socket.onerror = () => {
      this.lastError.set('Notifications WebSocket connection error');
    };
    socket.onclose = (event) => {
      this.connected.set(false);
      this.connecting.set(false);
      this.socket = null;
      if (this.intentionalDisconnect) return;
      if (event.code === TOKEN_EXPIRED_CLOSE_CODE) {
        this.refreshTokenAndReconnect();
        return;
      }
      this.scheduleReconnect();
    };
  }

  private refreshTokenAndReconnect(): void {
    this.auth.refreshToken().subscribe({
      next: () => this.openSocket(),
      error: () => this.disconnect(),
    });
  }

  private scheduleReconnect(): void {
    if (this.intentionalDisconnect) return;
    this.clearReconnectTimer();
    const delay = Math.min(
      RECONNECT_MAX_DELAY_MS,
      RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts),
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      if (!this.intentionalDisconnect) {
        this.openSocket();
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private handleMessage(raw: string): void {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const type = String(parsed['type'] ?? '');
      if (type === 'commerce.reprocess.finished') {
        this.commerceReprocessSubject.next(parsed as unknown as CommerceReprocessFinishedEvent);
        return;
      }
      if (type === 'notification.created') {
        const notification = this.extractNotification(parsed['notification']);
        if (notification) {
          this.notificationCreatedSubject.next(notification);
        }
        return;
      }
      if (type === 'notification.updated') {
        const notification = this.extractNotification(parsed['notification']);
        if (notification) {
          this.notificationUpdatedSubject.next(notification);
        }
        return;
      }
      if (isNotificationApi(parsed)) {
        const notification = parseNotificationApi(parsed);
        if (notification) {
          this.notificationCreatedSubject.next(notification);
        }
        return;
      }
      if (type === 'error') {
        this.lastError.set(String(parsed['message'] ?? 'Notifications WebSocket error'));
      }
    } catch {
      this.lastError.set('Invalid notifications WebSocket message');
    }
  }

  private extractNotification(value: unknown): AppNotification | null {
    if (!value || typeof value !== 'object') return null;
    const data = value as Record<string, unknown>;
    if (!isNotificationApi(data)) return null;
    return parseNotificationApi(data);
  }
}
