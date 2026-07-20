import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { chatMessageToItem } from '../mappers/chat.mapper';
import { ChatMessage, ChatMessageMetadata, ChatMessageType, ChatSocketIncomingEvent } from '../models/chat.models';
import { ChatRepository } from '../repositories/chat.repository';
import { ChatConversationStore } from './chat-conversation.store';
import { ChatConversationWebSocketService } from './chat-conversation-websocket.service';
import { ChatMediaService } from './chat-media.service';
import { ChatNotificationService } from './chat-notification.service';
import { validateChatMediaFile } from '../utils/chat-media.utils';

export const CHAT_MESSAGES_PER_PAGE = 20;

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly repo = inject(ChatRepository);
  private readonly socket = inject(ChatConversationWebSocketService);
  private readonly media = inject(ChatMediaService);
  readonly store = inject(ChatConversationStore);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(ChatNotificationService);
  currentUserId = signal<string | null>(null);
  private activeConversationId: string | null = null;
  private socketSub: Subscription | null = null;
  private readonly uploadSubs = new Map<string, Subscription>();

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
    this.clearUploadSubscriptions();
    this.socket.disconnect();
    this.activeConversationId = null;
    this.notifications.setActiveConversation(null);
  }

  reset(): void {
    this.closeConversation();
    this.currentUserId.set(null);
    this.store.clear();
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
      messageType: 'text',
      sender: userId,
      createdAt: new Date(),
      status: 'pending',
      isOwn: true,
    });
    this.dispatchSend(conversationId, clientMessageId, trimmed, 'text', {});
    return clientMessageId;
  }

  sendMediaMessage(file: File, localPreviewUrl?: string): string | null {
    const conversationId = this.activeConversationId;
    const userId = this.currentUserId();
    if (!conversationId || !userId) return null;
    const validation = validateChatMediaFile(file);
    if (!validation.valid || !validation.messageType) return null;
    const clientMessageId = crypto.randomUUID();
    const previewUrl = localPreviewUrl ?? (validation.messageType === 'image' ? URL.createObjectURL(file) : undefined);
    this.store.appendMessage({
      clientMessageId,
      body: file.name,
      messageType: validation.messageType,
      sender: userId,
      createdAt: new Date(),
      status: 'uploading',
      isOwn: true,
      uploadProgress: 0,
      localPreviewUrl: previewUrl,
      pendingFile: file,
    });
    this.startMediaUpload(conversationId, clientMessageId, file);
    return clientMessageId;
  }

  retryMessage(clientMessageId: string): void {
    const conversationId = this.activeConversationId;
    if (!conversationId) return;
    const message = this.store.messages().find((item) => item.clientMessageId === clientMessageId);
    if (!message || message.status !== 'failed') return;
    if (message.pendingFile && message.messageType !== 'text') {
      this.store.updateMessage(clientMessageId, { status: 'uploading', uploadProgress: 0 });
      this.startMediaUpload(conversationId, clientMessageId, message.pendingFile);
      return;
    }
    this.store.updateMessage(clientMessageId, { status: 'pending' });
    this.dispatchSend(
      conversationId,
      clientMessageId,
      message.body,
      message.messageType,
      message.metadata ?? {},
    );
  }

  refreshMediaUrls(): void {
    const conversationId = this.activeConversationId;
    if (!conversationId) return;
    this.repo.listMessagesPage(conversationId, { perPage: CHAT_MESSAGES_PER_PAGE }).subscribe({
      next: (page) => {
        for (const message of page.results) {
          if (message.messageType === 'text' || message.messageType === 'system') continue;
          const metadata = message.metadata as ChatMessageMetadata;
          if (!metadata?.url) continue;
          const existing = this.store.messages().find((item) => item.id === message.id);
          if (!existing) continue;
          this.store.updateMessage(existing.clientMessageId, {
            metadata: { ...existing.metadata, ...metadata },
          });
        }
      },
      error: () => undefined,
    });
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

  private startMediaUpload(conversationId: string, clientMessageId: string, file: File): void {
    this.uploadSubs.get(clientMessageId)?.unsubscribe();
    const sub = this.media.uploadMedia(conversationId, file).subscribe({
      next: (event) => {
        if (event.progress < 100) {
          this.store.updateMessage(clientMessageId, { uploadProgress: event.progress });
          return;
        }
        if (!event.response) return;
        const metadata: ChatMessageMetadata = {
          ...event.response.metadata,
          url: event.response.url || event.response.metadata.url,
        };
        this.store.updateMessage(clientMessageId, {
          status: 'pending',
          uploadProgress: 100,
          metadata,
          body: metadata.filename || file.name,
          pendingFile: file,
        });
        this.dispatchSend(
          conversationId,
          clientMessageId,
          metadata.filename || file.name,
          event.response.messageType,
          metadata,
        );
        this.uploadSubs.delete(clientMessageId);
      },
      error: () => {
        this.store.updateMessage(clientMessageId, { status: 'failed', uploadProgress: undefined });
        this.uploadSubs.delete(clientMessageId);
      },
    });
    this.uploadSubs.set(clientMessageId, sub);
  }

  private dispatchSend(
    conversationId: string,
    clientMessageId: string,
    body: string,
    messageType: ChatMessageType = 'text',
    metadata: ChatMessageMetadata | Record<string, unknown> = {},
  ): void {
    const sent = this.socket.sendMessage(body, clientMessageId, messageType, metadata);
    if (!sent) {
      this.sendViaRest(conversationId, clientMessageId, body, messageType, metadata);
    }
  }

  private sendViaRest(
    conversationId: string,
    clientMessageId: string,
    body: string,
    messageType: ChatMessageType = 'text',
    metadata: ChatMessageMetadata | Record<string, unknown> = {},
  ): void {
    this.repo.sendMessage(conversationId, {
      body,
      messageType,
      metadata,
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
        if (event.message.senderId) {
          this.socket.markUserOnline(event.message.senderId);
        }
        this.applyServerMessage(event.message, 'sent');
        this.notifications.applyActiveConversationMessage(event.message);
        break;
      case 'messages.read':
        if (event.userId) {
          this.socket.markUserOnline(event.userId);
        }
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
      const previous = existing[index];
      if (previous.localPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previous.localPreviewUrl);
      }
      this.store.updateMessage(existing[index].clientMessageId, {
        id: item.id,
        body: item.body,
        messageType: item.messageType,
        metadata: item.metadata,
        sender: item.sender,
        senderName: item.senderName,
        createdAt: item.createdAt,
        status: 'sent',
        uploadProgress: undefined,
        localPreviewUrl: undefined,
        pendingFile: undefined,
      });
      return;
    }
    this.store.appendMessage(item);
  }

  private clearUploadSubscriptions(): void {
    for (const sub of this.uploadSubs.values()) {
      sub.unsubscribe();
    }
    this.uploadSubs.clear();
  }
}
