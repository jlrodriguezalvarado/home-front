import { Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConversationParticipant, PeerDisplayNameResponse } from '../models/chat.models';
import { ChatPeerDisplayNameService } from '../services/chat-peer-display-name.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DialogFormDirective } from '../../../shared/directives/dialog-form.directive';

@Component({
  selector: 'app-rename-chat-contact-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogFormDirective],
  templateUrl: './rename-chat-contact-dialog.component.html',
})
export class RenameChatContactDialogComponent {
  conversationId = input.required<string>();
  participant = input.required<ConversationParticipant>();
  aliasChanged = output<PeerDisplayNameResponse>();
  cancelled = output<void>();
  peerDisplayNames = inject(ChatPeerDisplayNameService);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  displayNameDraft = signal('');
  saving = signal(false);
  restoring = signal(false);
  hasCustomName = signal(false);

  constructor() {
    effect(() => {
      const participant = this.participant();
      this.displayNameDraft.set(participant.customDisplayName ?? participant.user.name);
      this.hasCustomName.set(participant.customDisplayName != null);
    });
  }

  save(): void {
    const trimmed = this.displayNameDraft().trim();
    if (!trimmed || trimmed.length > 255 || this.saving() || this.restoring()) return;
    this.saving.set(true);
    this.peerDisplayNames.setDisplayName(
      this.conversationId(),
      this.participant().user.id,
      trimmed,
    ).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.aliasChanged.emit(response);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.i18n.t('renameContactFailed'));
      },
    });
  }

  restoreDefault(): void {
    if (this.saving() || this.restoring()) return;
    this.restoring.set(true);
    this.peerDisplayNames.clearDisplayName(
      this.conversationId(),
      this.participant().user.id,
    ).subscribe({
      next: (response) => {
        this.restoring.set(false);
        this.aliasChanged.emit(response);
      },
      error: () => {
        this.restoring.set(false);
        this.toast.error(this.i18n.t('renameContactFailed'));
      },
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
