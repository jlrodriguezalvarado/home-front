import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChatRepository } from '../repositories/chat.repository';
import { PushNotificationService } from '../services/push-notification.service';
import { ChatInboxStore } from '../services/chat-inbox.store';
import { Conversation } from '../models/chat.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { ConversationFormComponent } from '../conversation-form/conversation-form.component';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [
    CommonModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ConversationFormComponent,
  ],
  templateUrl: './conversation-list.component.html',
  styleUrl: './conversation-list.component.scss',
})
export class ConversationListComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  repo = inject(ChatRepository);
  push = inject(PushNotificationService);
  inboxStore = inject(ChatInboxStore);
  i18n = inject(I18nService);
  router = inject(Router);
  loading = signal(false);
  error = signal(false);
  showDialog = signal(false);
  conversations = this.inboxStore.conversations;
  pushSupported = computed(() => this.push.isSupported());
  pushSubscribed = signal(false);

  ngOnInit(): void {
    this.load();
    void this.refreshPushSubscriptionState();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.repo.listConversations().subscribe({
      next: (items) => {
        this.inboxStore.setConversations(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  openDialog(): void {
    this.showDialog.set(true);
  }

  closeDialog(): void {
    this.showDialog.set(false);
  }

  onConversationCreated(conversation: Conversation): void {
    this.closeDialog();
    this.inboxStore.setConversations([
      conversation,
      ...this.conversations().filter((item) => item.id !== conversation.id),
    ]);
    void this.router.navigate(['/chat/conversations', conversation.id]);
  }

  openConversation(conversation: Conversation): void {
    void this.router.navigate(['/chat/conversations', conversation.id]);
  }

  async enableNotifications(): Promise<void> {
    await this.push.subscribe();
    await this.refreshPushSubscriptionState();
  }

  private async refreshPushSubscriptionState(): Promise<void> {
    this.pushSubscribed.set(await this.push.hasActiveSubscription());
  }

  formatDate(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  }

  participantNames(conversation: Conversation): string {
    return conversation.participants
      .map((participant) => participant.displayName || participant.user.name)
      .join(', ');
  }
}
