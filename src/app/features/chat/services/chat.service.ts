import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { chatMessageToItem } from '../mappers/chat.mapper';
import { ChatMessage, ChatSocketIncomingEvent } from '../models/chat.models';
import { ChatRepository } from '../repositories/chat.repository';
import { ChatConversationStore } from './chat-conversation.store';
import { ChatConversationWebSocketService } from './chat-conversation-websocket.service';
import { ChatNotificationService } from './chat-notification.service';

export const CHAT_MESSAGES_PER_PAGE = 20;

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly repo = inject(ChatRepository);
  private readonly socket = inject(ChatConversationWebSocketService);
  readonly store = inject(ChatConversationStore);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(ChatNotificationService);
  currentUserId = signal<string | null>(null);
  private activeConversationId: string | null = null;
  private socketSub: Subscription | null = null;

  openConversation(conversationId: string): void {
    this.activeConversationId = conversationId;
    this.notifications.setActiveConversation(conversationId);
    this.store.reset(conversationId);
    this.socket.connect(conversationId);
    this.subscribeToSocket();
    this.auth.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUserId.set(user.id);
        this.notifications.setCurrentUserId(user.id);
        this.loadInitialMessages(conversationId);
      },
      error: () => {
        this.currentUserId.set(null);
        this.loadInitialMessages(conversationId);
      },
    });
  }

  closeConversation(): void {
    this.socketSub?.unsubscribe();
    this.socketSub = null;
    this.socket.disconnect();
    this.activeConversationId = null;
    this.notifications.setActiveConversation(null);
  }

  applyInboxMessage(message: ChatMessage): void {
    this.applyServerMessage(message, 'sent');
    this.notifications.applyActiveConversationMessage(message);
  }

  loadInitialMessages(conversationId: string): void {
    this.store.loadingInitial.set(true);
    this.repo.listMessagesPage(conversationId, { perPage: CHAT_MESSAGES_PER_PAGE }).subscribe({
      next: (page) => {
        const userId = this.currentUserId() ?? '';
        const items = [...page.results].reverse().map((message) => chatMessageToItem(message, userId, 'sent'));
        this.store.setInitialPage(items, page.nextBefore, page.hasMore);
        this.store.loadingInitial.set(false);
      },
      error: () => {
        this.store.loadingInitial.set(false);
      },
    });
  }

  loadOlderMessages(): void {
    const conversationId = this.activeConversationId;
    const nextBefore = this.store.nextBefore();
    if (!conversationId || !nextBefore || !this.store.hasMore() || this.store.loadingOlder()) return;
    this.store.loadingOlder.set(true);
    this.repo.listMessagesPage(conversationId, {
      perPage: CHAT_MESSAGES_PER_PAGE,
      before: nextBefore,
    }).subscribe({
      next: (page) => {
        const userId = this.currentUserId() ?? '';
        const items = [...page.results].reverse().map((message) => chatMessageToItem(message, userId, 'sent'));
        this.store.prependMessages(items);
        this.store.nextBefore.set(page.nextBefore);
        this.store.hasMore.set(page.hasMore);
        this.store.loadingOlder.set(false);
      },
      error: () => {
        this.store.loadingOlder.set(false);
      },
    });
  }

  sendMessage(body: string): string | null {
    const trimmed = body.trim();
    const conversationId = this.activeConversationId;
    const userId = this.currentUserId();
    if (!trimmed || !conversationId || !userId) return null;
    const clientMessageId = crypto.randomUUID();
    this.store.appendMessage({
      clientMessageId,
      body: trimmed,
      sender: userId,
      createdAt: new Date(),
      status: 'pending',
      isOwn: true,
    });
    this.dispatchSend(conversationId, clientMessageId, trimmed);
    return clientMessageId;
  }

  retryMessage(clientMessageId: string): void {
    const conversationId = this.activeConversationId;
    if (!conversationId) return;
    const message = this.store.messages().find((item) => item.clientMessageId === clientMessageId);
    if (!message || message.status !== 'failed') return;
    this.store.updateMessage(clientMessageId, { status: 'pending' });
    this.dispatchSend(conversationId, clientMessageId, message.body);
  }

  markAsRead(): void {
    const conversationId = this.activeConversationId;
    if (!conversationId) return;
    this.notifications.markConversationRead(conversationId);
    this.repo.markAsRead(conversationId).subscribe({
      next: () => this.socket.markAsRead(),
      error: () => undefined,
    });
  }

  private dispatchSend(conversationId: string, clientMessageId: string, body: string): void {
    const sent = this.socket.sendMessage(body, clientMessageId);
    if (!sent) {
      this.sendViaRest(conversationId, clientMessageId, body);
    }
  }

  private sendViaRest(conversationId: string, clientMessageId: string, body: string): void {
    this.repo.sendMessage(conversationId, {
      body,
      messageType: 'text',
      metadata: {},
      clientMessageId,
    }).subscribe({
      next: (message) => this.applyServerMessage(message, 'sent'),
      error: () => this.store.updateMessage(clientMessageId, { status: 'failed' }),
    });
  }

  private subscribeToSocket(): void {
    this.socketSub?.unsubscribe();
    this.socketSub = this.socket.events$.subscribe((event) => this.handleSocketEvent(event));
  }

  private handleSocketEvent(event: ChatSocketIncomingEvent): void {
    switch (event.type) {
      case 'message.created':
        this.applyServerMessage(event.message, 'sent');
        this.notifications.applyActiveConversationMessage(event.message);
        break;
      case 'message.send.failed':
        if (event.clientMessageId) {
          this.store.updateMessage(event.clientMessageId, { status: 'failed' });
        }
        break;
      default:
        break;
    }
  }

  private applyServerMessage(message: ChatMessage, status: 'sent'): void {
    const userId = this.currentUserId() ?? '';
    const item = chatMessageToItem(message, userId, status);
    const existing = this.store.messages();
    const index = existing.findIndex((entry) =>
      (message.id && entry.id === message.id)
      || (message.clientMessageId && entry.clientMessageId === message.clientMessageId),
    );
    if (index >= 0) {
      this.store.updateMessage(existing[index].clientMessageId, {
        id: item.id,
        body: item.body,
        sender: item.sender,
        senderName: item.senderName,
        createdAt: item.createdAt,
        status: 'sent',
      });
      return;
    }
    this.store.appendMessage(item);
  }
}
