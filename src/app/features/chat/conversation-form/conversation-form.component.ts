import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
  computed,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ChatRepository } from '../repositories/chat.repository';
import { ChatUserSummary, Conversation, ConversationPayload } from '../models/chat.models';
import { AuthService } from '../../../core/auth/auth.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';
import {
  SearchSelectComponent,
  SearchSelectOption,
} from '../../../shared/components/search-select.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';

@Component({
  selector: 'app-conversation-form',
  standalone: true,
  imports: [FormsModule, SearchSelectComponent, LoadingStateComponent],
  templateUrl: './conversation-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './conversation-form.component.scss',
})
export class ConversationFormComponent implements OnInit, OnDestroy {
  created = output<Conversation>();
  cancelled = output<void>();
  repo = inject(ChatRepository);
  auth = inject(AuthService);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  saving = signal(false);
  title = signal('');
  isGroup = signal(false);
  users = signal<ChatUserSummary[]>([]);
  usersLoading = signal(false);
  selectedParticipants = signal<ChatUserSummary[]>([]);
  currentUserId = signal<string | null>(null);
  userSearchDraft = signal('');
  userOptions = computed<SearchSelectOption[]>(() => {
    const selectedIds = new Set(this.selectedParticipants().map((p) => p.id));
    const currentId = this.currentUserId();
    return this.users()
      .filter((user) => user.id !== currentId && !selectedIds.has(user.id))
      .map((user) => ({
        value: user.id,
        label: this.formatUserLabel(user),
      }));
  });
  private readonly destroy$ = new Subject<void>();
  private readonly userSearchSubject = new Subject<string>();

  ngOnInit(): void {
    this.auth.getCurrentUser().subscribe({
      next: (user) => this.currentUserId.set(user.id),
      error: () => this.currentUserId.set(null),
    });
    this.userSearchSubject
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.userSearchDraft.set(query);
        this.loadUsers();
      });
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.userSearchSubject.complete();
  }

  loadUsers(): void {
    this.usersLoading.set(true);
    const params: Record<string, string> = {};
    const search = this.userSearchDraft().trim();
    if (search) params['search'] = search;
    this.repo.listUsers(params).subscribe({
      next: (items) => {
        this.users.set(items);
        this.usersLoading.set(false);
      },
      error: () => {
        this.users.set([]);
        this.usersLoading.set(false);
      },
    });
  }

  onUserSearchChange(query: string): void {
    this.userSearchSubject.next(query);
  }

  onUserSelected(userId: string | null): void {
    if (!userId) return;
    const user = this.users().find((item) => item.id === userId);
    if (!user) return;
    if (this.isGroup()) {
      this.selectedParticipants.update((items) => [...items, user]);
    } else {
      this.selectedParticipants.set([user]);
    }
  }

  removeParticipant(userId: string): void {
    this.selectedParticipants.update((items) => items.filter((item) => item.id !== userId));
  }

  onIsGroupChange(value: boolean): void {
    this.isGroup.set(value);
    if (!value && this.selectedParticipants().length > 1) {
      this.selectedParticipants.set(this.selectedParticipants().slice(0, 1));
    }
  }

  formatUserLabel(user: ChatUserSummary): string {
    if (user.email) return `${user.name} (${user.email})`;
    return user.name;
  }

  cancel(): void {
    this.cancelled.emit();
  }

  save(): void {
    const participants = this.selectedParticipants();
    const payload: ConversationPayload = {
      title: this.title().trim(),
      isGroup: this.isGroup(),
      participantIds: participants.map((p) => p.id),
    };
    if (!payload.isGroup && payload.participantIds.length < 1) {
      this.toast.error(
        this.i18n.lang() === 'en'
          ? 'Direct conversation requires at least one participant'
          : 'La conversación directa requiere al menos un participante',
      );
      return;
    }
    if (payload.isGroup && !payload.title) {
      this.toast.error(
        this.i18n.lang() === 'en'
          ? 'Group title is required'
          : 'El título del grupo es obligatorio',
      );
      return;
    }
    if (payload.isGroup && payload.participantIds.length < 1) {
      this.toast.error(
        this.i18n.lang() === 'en'
          ? 'Group conversation requires at least one participant'
          : 'El grupo requiere al menos un participante',
      );
      return;
    }
    if (!payload.isGroup && !payload.title && participants.length === 1) {
      payload.title = participants[0].name;
    }
    this.saving.set(true);
    this.repo.createConversation(payload).subscribe({
      next: (conversation) => {
        this.saving.set(false);
        this.toast.success(this.i18n.t('createConversation'));
        this.created.emit(conversation);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.i18n.lang() === 'en' ? 'Save failed' : 'Error al guardar');
      },
    });
  }
}
