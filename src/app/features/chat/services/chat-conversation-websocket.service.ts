import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { ChatSocketIncomingEvent } from '../models/chat.models';
import { mapChatSocketEventFromApi, mapChatSocketOutgoingToApi } from '../mappers/chat.mapper';

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;
const TOKEN_EXPIRED_CLOSE_CODE = 4001;

@Injectable({ providedIn: 'root' })
export class ChatConversationWebSocketService {
  private readonly auth = inject(AuthService);
  private readonly eventSubject = new Subject<ChatSocketIncomingEvent>();
  readonly events$: Observable<ChatSocketIncomingEvent> = this.eventSubject.asObservable();
  private socket: WebSocket | null = null;
  private conversationId: string | null = null;
  private reconnectAttempts = 0;
  private intentionalDisconnect = false;
  private typingStopTimer: ReturnType<typeof setTimeout> | null = null;
  connected = signal(false);
  connecting = signal(false);
  typingUsers = signal<Record<string, boolean>>({});
  lastError = signal<string | null>(null);

  connect(conversationId: string): void {
    this.disconnect();
    this.intentionalDisconnect = false;
    this.conversationId = conversationId;
    this.reconnectAttempts = 0;
    this.openSocket(conversationId);
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearTypingStopTimer();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.conversationId = null;
    this.connected.set(false);
    this.connecting.set(false);
    this.typingUsers.set({});
  }

  sendMessage(
    body: string,
    clientMessageId: string,
    messageType: 'text' | 'image' | 'file' = 'text',
    metadata: Record<string, unknown> = {},
  ): boolean {
    const trimmed = body.trim();
    if (!trimmed || !this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    const payload = mapChatSocketOutgoingToApi({
      type: 'message.send',
      body: trimmed,
      messageType,
      metadata,
      clientMessageId,
    });
    this.socket.send(JSON.stringify(payload));
    return true;
  }

  sendTypingStart(): void {
    this.sendRaw({ type: 'typing.start' });
    this.scheduleTypingStop();
  }

  sendTypingStop(): void {
    this.clearTypingStopTimer();
    this.sendRaw({ type: 'typing.stop' });
  }

  markAsRead(): void {
    this.sendRaw({ type: 'message.read' });
  }

  private openSocket(conversationId: string): void {
    const token = this.auth.getAccessToken();
    if (!token) {
      this.lastError.set('Not authenticated');
      return;
    }
    this.connecting.set(true);
    this.lastError.set(null);
    const wsBase = environment.wsUrl.replace(/\/$/, '');
    const url = `${wsBase}/chat/conversations/${conversationId}/?token=${encodeURIComponent(token)}`;
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
      this.lastError.set('WebSocket connection error');
    };
    socket.onclose = (event) => {
      this.connected.set(false);
      this.connecting.set(false);
      if (this.intentionalDisconnect || this.conversationId !== conversationId) return;
      if (event.code === TOKEN_EXPIRED_CLOSE_CODE) {
        this.auth.refreshToken().subscribe({
          next: () => {
            if (!this.intentionalDisconnect && this.conversationId === conversationId) {
              this.openSocket(conversationId);
            }
          },
          error: () => this.disconnect(),
        });
        return;
      }
      this.tryReconnect(conversationId);
    };
  }

  private tryReconnect(conversationId: string): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.lastError.set('Connection lost. Please refresh the page.');
      return;
    }
    this.reconnectAttempts += 1;
    const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1);
    setTimeout(() => {
      if (!this.intentionalDisconnect && this.conversationId === conversationId) {
        this.openSocket(conversationId);
      }
    }, delay);
  }

  private handleMessage(raw: string): void {
    try {
      const parsed = JSON.parse(raw);
      const event = mapChatSocketEventFromApi(parsed);
      switch (event.type) {
        case 'typing.changed':
          this.typingUsers.update((users) => ({
            ...users,
            [event.userId]: event.isTyping,
          }));
          break;
        case 'error':
          this.lastError.set(event.message);
          break;
        default:
          break;
      }
      this.eventSubject.next(event);
    } catch {
      this.lastError.set('Invalid WebSocket message');
    }
  }

  private sendRaw(event: { type: string }): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(event));
  }

  private scheduleTypingStop(): void {
    this.clearTypingStopTimer();
    this.typingStopTimer = setTimeout(() => this.sendTypingStop(), 3000);
  }

  private clearTypingStopTimer(): void {
    if (this.typingStopTimer) {
      clearTimeout(this.typingStopTimer);
      this.typingStopTimer = null;
    }
  }
}
