import { Injectable, computed, signal } from '@angular/core';
import { applyPeerDisplayNameToConversation } from '../mappers/chat.mapper';
import { Conversation, InboxMessageEvent, PeerDisplayNameResponse } from '../models/chat.models';

@Injectable({ providedIn: 'root' })
export class ChatInboxStore {
  conversations = signal<Conversation[]>([]);
  globalUnreadCount = computed(() =>
    this.conversations().reduce((sum, item) => sum + item.unreadCount, 0),
  );

  setConversations(items: Conversation[]): void {
    this.conversations.set(items);
  }

  reset(): void {
    this.conversations.set([]);
  }

  applyInboxEvent(event: InboxMessageEvent): void {
    const { conversationId, conversationTitle, isGroup, unreadCount, message } = event;
    this.conversations.update((items) => {
      const index = items.findIndex((item) => item.id === conversationId);
      if (index < 0) {
        return [{
          id: conversationId,
          title: conversationTitle,
          isGroup,
          participants: [],
          lastMessage: message,
          lastMessageAt: message.createdAt,
          unreadCount,
        }, ...items];
      }
      const existing = items[index];
      const updated: Conversation = {
        ...existing,
        title: conversationTitle || existing.title,
        isGroup,
        lastMessage: message,
        lastMessageAt: message.createdAt,
        unreadCount,
      };
      const rest = items.filter((item) => item.id !== conversationId);
      return [updated, ...rest];
    });
  }

  markConversationRead(conversationId: string): void {
    this.conversations.update((items) =>
      items.map((item) =>
        item.id === conversationId ? { ...item, unreadCount: 0 } : item,
      ),
    );
  }

  applyPeerDisplayName(
    conversationId: string,
    targetUserId: string,
    response: PeerDisplayNameResponse,
  ): void {
    this.conversations.update((items) =>
      items.map((item) =>
        item.id === conversationId
          ? applyPeerDisplayNameToConversation(item, targetUserId, response)
          : item,
      ),
    );
  }
}
