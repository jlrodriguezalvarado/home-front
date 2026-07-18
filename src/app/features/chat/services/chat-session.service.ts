import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/auth/auth.service';
import { ChatInboxWebSocketService } from './chat-inbox-websocket.service';
import { ChatConversationWebSocketService } from './chat-conversation-websocket.service';
import { PushNotificationService } from './push-notification.service';
import { ChatNotificationService } from './chat-notification.service';
import { ChatService } from './chat.service';

@Injectable({ providedIn: 'root' })
export class ChatSessionService {
  private readonly auth = inject(AuthService);
  private readonly inboxWs = inject(ChatInboxWebSocketService);
  private readonly conversationWs = inject(ChatConversationWebSocketService);
  private readonly push = inject(PushNotificationService);
  private readonly notifications = inject(ChatNotificationService);
  private readonly chat = inject(ChatService);
  private started = false;

  constructor() {
    this.inboxWs.messages$
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        this.notifications.handleInboxEvent(event);
        if (event.conversationId === this.notifications.activeConversationId()) {
          this.chat.applyInboxMessage(event.message);
          if (event.message.senderId) {
            this.conversationWs.markUserOnline(event.message.senderId);
          }
        }
      });
    this.inboxWs.presence$
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event.conversationId !== this.notifications.activeConversationId()) return;
        if (event.isOnline) {
          this.conversationWs.markUserOnline(event.userId);
        } else {
          this.conversationWs.markUserOffline(event.userId);
        }
      });
  }

  start(): void {
    if (!this.auth.isAuthenticated() || this.started) return;
    this.started = true;
    this.inboxWs.connect();
    void this.push.registerAfterLogin();
    this.auth.getCurrentUser().subscribe({
      next: (user) => this.notifications.setCurrentUserId(user.id),
      error: () => this.notifications.setCurrentUserId(null),
    });
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    this.inboxWs.disconnect();
    this.notifications.setCurrentUserId(null);
    this.notifications.setActiveConversation(null);
    await this.push.unsubscribeOnLogout();
  }
}
