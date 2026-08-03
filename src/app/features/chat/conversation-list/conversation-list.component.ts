import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';

import { Router } from '@angular/router';
import { ChatRepository } from '../repositories/chat.repository';
import { ChatInboxStore } from '../services/chat-inbox.store';
import { Conversation } from '../models/chat.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { ConversationFormComponent } from '../conversation-form/conversation-form.component';
import { DialogEscapeDirective } from '../../../shared/directives/dialog-escape.directive';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ConversationFormComponent,
    DialogEscapeDirective,
  ],
  templateUrl: './conversation-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './conversation-list.component.scss',
})
export class ConversationListComponent implements OnInit {
  repo = inject(ChatRepository);
  inboxStore = inject(ChatInboxStore);
  i18n = inject(I18nService);
  router = inject(Router);
  loading = signal(false);
  error = signal(false);
  showDialog = signal(false);
  conversations = this.inboxStore.conversations;

  ngOnInit(): void {
    this.load();
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
