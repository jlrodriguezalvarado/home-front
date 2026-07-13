import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { InboxMessageEvent, InboxPresenceEvent } from '../models/chat.models';
import { mapInboxEventFromApi, mapInboxPresenceEventFromApi } from '../mappers/chat.mapper';

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const TOKEN_EXPIRED_CLOSE_CODE = 4001;

@Injectable({ providedIn: 'root' })
export class ChatInboxWebSocketService {
  private readonly auth = inject(AuthService);
  private readonly eventSubject = new Subject<InboxMessageEvent>();
  private readonly presenceSubject = new Subject<InboxPresenceEvent>();
  readonly messages$: Observable<InboxMessageEvent> = this.eventSubject.asObservable();
  readonly presence$: Observable<InboxPresenceEvent> = this.presenceSubject.asObservable();
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
    const url = `${wsBase}/chat/inbox/?token=${encodeURIComponent(token)}`;
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
      this.lastError.set('Inbox WebSocket connection error');
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
      const parsed = JSON.parse(raw);
      const event = mapInboxEventFromApi(parsed);
      if (event) {
        this.eventSubject.next(event);
        return;
      }
      const presenceEvent = mapInboxPresenceEventFromApi(parsed);
      if (presenceEvent) {
        this.presenceSubject.next(presenceEvent);
        return;
      }
      const data = parsed as Record<string, unknown>;
      if (data['type'] === 'error') {
        this.lastError.set(String(data['message'] ?? 'Inbox WebSocket error'));
      }
    } catch {
      this.lastError.set('Invalid inbox WebSocket message');
    }
  }
}
