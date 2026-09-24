import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
  computed,
  ElementRef,
  ViewChild,
  AfterViewChecked,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { ChatRepository } from '../repositories/chat.repository';
import { ChatConversationWebSocketService } from '../services/chat-conversation-websocket.service';
import { ChatService } from '../services/chat.service';
import { ChatInboxStore } from '../services/chat-inbox.store';
import { ChatMessageItem } from '../models/chat.models';
import {
  Conversation,
  ConversationParticipant,
  PeerDisplayNameResponse,
} from '../models/chat.models';
import {
  applyPeerDisplayNameToConversation,
  getConversationDisplayTitle,
} from '../mappers/chat.mapper';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { RenameChatContactDialogComponent } from '../rename-chat-contact-dialog/rename-chat-contact-dialog.component';
import { ChatMessageContentComponent } from '../components/chat-message-content/chat-message-content.component';
import {
  ChatMediaComposerComponent,
  ChatMediaPreview,
} from '../components/chat-media-composer/chat-media-composer.component';
import { DialogEscapeDirective } from '../../../shared/directives/dialog-escape.directive';

const SCROLL_EDGE_THRESHOLD_PX = 80;

@Component({
  selector: 'app-conversation-room',
  standalone: true,
  imports: [
    RouterLink,
    LoadingStateComponent,
    ErrorStateComponent,
    RenameChatContactDialogComponent,
    ChatMessageContentComponent,
    ChatMediaComposerComponent,
    DialogEscapeDirective,
  ],
  templateUrl: './conversation-room.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './conversation-room.component.scss',
})
export class ConversationRoomComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;
  repo = inject(ChatRepository);
  chat = inject(ChatService);
  inboxStore = inject(ChatInboxStore);
  socket = inject(ChatConversationWebSocketService);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  route = inject(ActivatedRoute);
  conversation = signal<Conversation | null>(null);
  showRenameDialog = signal(false);
  loading = signal(false);
  error = signal(false);
  messageDraft = signal('');
  shouldScrollToBottom = signal(false);
  isAtBottom = signal(true);
  messages = computed(() => this.chat.store.messages());
  loadingInitial = computed(() => this.chat.store.loadingInitial());
  loadingOlder = computed(() => this.chat.store.loadingOlder());
  hasMore = computed(() => this.chat.store.hasMore());
  newMessagesBelow = computed(() => this.chat.store.newMessagesBelow());
  onlineUsers = computed(() => this.socket.onlineUsers());
  peerIsOnline = computed(() => {
    const conversation = this.conversation();
    const currentUserId = this.chat.currentUserId();
    const onlineUsers = this.onlineUsers();
    if (!conversation || !currentUserId) return false;
    return conversation.participants.some(
      (participant) => participant.user.id !== currentUserId && onlineUsers[participant.user.id],
    );
  });
  typingUsers = computed(() => this.socket.typingUsers());
  typingLabel = computed(() => {
    const users = this.typingUsers();
    const currentUserId = this.chat.currentUserId();
    const typingIds = Object.keys(users).filter((id) => users[id] && id !== currentUserId);
    if (!typingIds.length) return '';
    return `${this.i18n.t('typing')}...`;
  });
  conversationTitle = computed(() => {
    const conversation = this.conversation();
    if (!conversation) return this.i18n.t('conversation');
    return getConversationDisplayTitle(conversation, this.chat.currentUserId());
  });
  otherParticipant = computed((): ConversationParticipant | null => {
    const conversation = this.conversation();
    const currentUserId = this.chat.currentUserId();
    if (!conversation || conversation.isGroup || !currentUserId) return null;
    return (
      conversation.participants.find((participant) => participant.user.id !== currentUserId) ?? null
    );
  });
  canRenameContact = computed(() => this.otherParticipant() != null);
  conversationId = '';
  private pendingClientMessageId = signal<string | null>(null);
  private previousMessageCount = 0;
  private initialScrollDone = false;
  private scrollHeightBeforeLoadOlder = 0;
  private readonly destroy$ = new Subject<void>();
  private readonly typingSubject = new Subject<void>();

  constructor() {
    effect(() => {
      const messages = this.messages();
      const count = messages.length;
      if (this.loadingInitial() || count === 0) return;
      if (this.previousMessageCount === 0) {
        this.previousMessageCount = count;
        return;
      }
      if (count > this.previousMessageCount) {
        const last = messages[count - 1];
        if (!last.isOwn) {
          if (this.isAtBottom()) {
            this.shouldScrollToBottom.set(true);
            this.chat.store.clearNewMessagesBelow();
          } else {
            this.chat.store.incrementNewMessagesBelow();
          }
        }
      }
      this.previousMessageCount = count;
    });
    effect(() => {
      const pendingId = this.pendingClientMessageId();
      if (!pendingId) return;
      const message = this.messages().find((item) => item.clientMessageId === pendingId);
      if (message?.status === 'sent') {
        this.messageDraft.set('');
        this.pendingClientMessageId.set(null);
      }
    });
    effect(() => {
      if (!this.loadingInitial() && this.messages().length > 0 && !this.initialScrollDone) {
        this.shouldScrollToBottom.set(true);
        this.initialScrollDone = true;
      }
    });
    effect(() => {
      if (!this.loadingOlder() && this.scrollHeightBeforeLoadOlder > 0) {
        const el = this.messagesContainer?.nativeElement;
        const previousHeight = this.scrollHeightBeforeLoadOlder;
        this.scrollHeightBeforeLoadOlder = 0;
        if (el) {
          requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight - previousHeight;
          });
        }
      }
    });
  }

  ngOnInit(): void {
    this.conversationId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.conversationId) {
      this.error.set(true);
      return;
    }
    this.typingSubject.pipe(debounceTime(300), takeUntil(this.destroy$)).subscribe(() => {
      this.socket.sendTypingStart();
    });
    this.loadConversation();
    this.chat.openConversation(this.conversationId);
    this.chat.markAsRead();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom()) {
      this.scrollToBottom();
      this.shouldScrollToBottom.set(false);
    }
  }

  ngOnDestroy(): void {
    this.chat.closeConversation();
    this.destroy$.next();
    this.destroy$.complete();
    this.typingSubject.complete();
  }

  loadConversation(): void {
    this.loading.set(true);
    this.error.set(false);
    this.repo.getConversation(this.conversationId).subscribe({
      next: (conversation) => {
        this.conversation.set(conversation);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  openRenameDialog(): void {
    if (!this.canRenameContact()) return;
    this.showRenameDialog.set(true);
  }

  closeRenameDialog(): void {
    this.showRenameDialog.set(false);
  }

  onAliasChanged(response: PeerDisplayNameResponse): void {
    const conversation = this.conversation();
    if (!conversation) return;
    const updated = applyPeerDisplayNameToConversation(
      conversation,
      response.targetUserId,
      response,
    );
    this.conversation.set(updated);
    this.inboxStore.applyPeerDisplayName(conversation.id, response.targetUserId, response);
    this.closeRenameDialog();
  }

  onMessagesScroll(): void {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.isAtBottom.set(distanceFromBottom < SCROLL_EDGE_THRESHOLD_PX);
    if (this.isAtBottom()) {
      this.chat.store.clearNewMessagesBelow();
    }
    if (el.scrollTop < SCROLL_EDGE_THRESHOLD_PX && this.hasMore() && !this.loadingOlder()) {
      this.loadOlderMessages();
    }
  }

  loadOlderMessages(): void {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;
    this.scrollHeightBeforeLoadOlder = el.scrollHeight;
    this.chat.loadOlderMessages();
  }

  scrollToLatest(): void {
    this.chat.store.clearNewMessagesBelow();
    this.shouldScrollToBottom.set(true);
  }

  onMessageInput(value: string): void {
    this.messageDraft.set(value);
    if (value.trim()) {
      this.typingSubject.next();
    } else {
      this.socket.sendTypingStop();
    }
  }

  sendMessage(): void {
    const body = this.messageDraft().trim();
    if (!body) return;
    const clientMessageId = this.chat.sendMessage(body);
    if (!clientMessageId) return;
    this.pendingClientMessageId.set(clientMessageId);
    this.shouldScrollToBottom.set(true);
    this.socket.sendTypingStop();
  }

  onSendMedia(preview: ChatMediaPreview): void {
    const clientMessageId = this.chat.sendMediaMessage(preview.file, preview.previewUrl);
    if (!clientMessageId) return;
    this.pendingClientMessageId.set(clientMessageId);
    this.shouldScrollToBottom.set(true);
    this.socket.sendTypingStop();
  }

  onMediaLoadError(): void {
    this.chat.refreshMediaUrls();
  }

  retryMessage(message: ChatMessageItem): void {
    this.chat.retryMessage(message.clientMessageId);
    this.pendingClientMessageId.set(message.clientMessageId);
    this.shouldScrollToBottom.set(true);
  }

  cancelFailedMessage(message: ChatMessageItem): void {
    this.chat.store.messages.update((current) =>
      current.filter((item) => item.clientMessageId !== message.clientMessageId),
    );
    if (this.pendingClientMessageId() === message.clientMessageId) {
      this.pendingClientMessageId.set(null);
    }
  }

  formatTime(value: Date): string {
    if (Number.isNaN(value.getTime())) return '';
    return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    this.isAtBottom.set(true);
  }
}
