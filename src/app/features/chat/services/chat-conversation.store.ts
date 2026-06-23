import { Injectable, signal } from '@angular/core';
import { ChatMessageItem } from '../models/chat.models';
import { findChatMessageIndex, mergeChatMessageItem } from '../mappers/chat.mapper';

@Injectable({ providedIn: 'root' })
export class ChatConversationStore {
  conversationId = signal<string | null>(null);
  messages = signal<ChatMessageItem[]>([]);
  nextBefore = signal<string | null>(null);
  hasMore = signal(false);
  loadingInitial = signal(false);
  loadingOlder = signal(false);
  newMessagesBelow = signal(0);

  reset(conversationId: string): void {
    this.conversationId.set(conversationId);
    this.messages.set([]);
    this.nextBefore.set(null);
    this.hasMore.set(false);
    this.loadingInitial.set(false);
    this.loadingOlder.set(false);
    this.newMessagesBelow.set(0);
  }

  setInitialPage(
    items: ChatMessageItem[],
    nextBefore: string | null,
    hasMore: boolean,
  ): void {
    this.messages.set(items);
    this.nextBefore.set(nextBefore);
    this.hasMore.set(hasMore);
  }

  prependMessages(items: ChatMessageItem[]): void {
    if (!items.length) return;
    this.messages.update((current) => [...items, ...current]);
  }

  appendMessage(item: ChatMessageItem): void {
    this.messages.update((current) => {
      const index = findChatMessageIndex(current, item.id, item.clientMessageId);
      if (index >= 0) {
        const updated = [...current];
        updated[index] = mergeChatMessageItem(current[index], item);
        return updated;
      }
      return [...current, item];
    });
  }

  updateMessage(clientMessageId: string, patch: Partial<ChatMessageItem>): void {
    this.messages.update((current) => {
      const index = findChatMessageIndex(current, undefined, clientMessageId);
      if (index < 0) return current;
      const updated = [...current];
      updated[index] = mergeChatMessageItem(current[index], patch);
      return updated;
    });
  }

  incrementNewMessagesBelow(): void {
    this.newMessagesBelow.update((count) => count + 1);
  }

  clearNewMessagesBelow(): void {
    this.newMessagesBelow.set(0);
  }
}
