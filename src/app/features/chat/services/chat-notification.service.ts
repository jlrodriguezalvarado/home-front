import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ChatMessage, InboxMessageEvent } from '../models/chat.models';
import { ChatInboxStore } from './chat-inbox.store';
import { ToastService } from '../../../shared/services/toast.service';
import { I18nService } from '../../../core/i18n/i18n.service';

@Injectable({ providedIn: 'root' })
export class ChatNotificationService {
  private readonly inboxStore = inject(ChatInboxStore);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  activeConversationId = signal<string | null>(null);
  currentUserId = signal<string | null>(null);
  readonly globalUnreadCount = this.inboxStore.globalUnreadCount;

  setActiveConversation(conversationId: string | null): void {
    this.activeConversationId.set(conversationId);
  }

  setCurrentUserId(userId: string | null): void {
    this.currentUserId.set(userId);
  }

  reset(): void {
    this.activeConversationId.set(null);
    this.currentUserId.set(null);
    this.inboxStore.reset();
  }

  handleInboxEvent(event: InboxMessageEvent): void {
    if (event.message.senderId === this.currentUserId()) return;
    const isActive = event.conversationId === this.activeConversationId();
    const unreadCount = isActive ? 0 : event.unreadCount;
    this.inboxStore.applyInboxEvent({ ...event, unreadCount });
    if (event.isMuted || isActive) return;
    const title = event.conversationTitle || this.i18n.t('newMessage');
    const preview = event.message.body.trim() || this.i18n.t('newMessage');
    this.toast.show(`${title}: ${preview}`, 'info');
  }

  applyActiveConversationMessage(message: ChatMessage): void {
    const conversationId = message.conversationId;
    if (!conversationId) return;
    this.inboxStore.applyInboxEvent({
      type: 'conversation.message_created',
      conversationId,
      conversationTitle: '',
      isGroup: false,
      isMuted: false,
      unreadCount: 0,
      message,
    });
  }

  markConversationRead(conversationId: string): void {
    this.inboxStore.markConversationRead(conversationId);
  }

  handleNotificationClick(data: Record<string, unknown> | null | undefined): void {
    if (!data) return;
    const url = data['url'];
    if (typeof url === 'string' && url.trim()) {
      void this.router.navigateByUrl(url);
      return;
    }
    const conversationId = data['conversationId'] ?? data['conversation_id'];
    if (conversationId) {
      void this.router.navigate(['/chat/conversations', String(conversationId)]);
    }
  }
}
