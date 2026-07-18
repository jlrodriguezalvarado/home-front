import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessageItem } from '../../models/chat.models';
import { ChatAudioPlayerComponent } from '../chat-audio-player/chat-audio-player.component';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { formatFileSize, getFileIconName } from '../../utils/chat-media.utils';
import { ChatTextSegment, isEmojiOnlyMessage, splitChatTextSegments } from '../../utils/chat-emoji.utils';

@Component({
  selector: 'app-chat-message-content',
  standalone: true,
  imports: [CommonModule, ChatAudioPlayerComponent],
  templateUrl: './chat-message-content.component.html',
  styleUrl: './chat-message-content.component.scss',
})
export class ChatMessageContentComponent {
  @Input({ required: true }) message!: ChatMessageItem;
  @Output() mediaLoadError = new EventEmitter<void>();
  i18n = inject(I18nService);
  lightboxOpen = false;

  get mediaUrl(): string | undefined {
    return this.message.metadata?.url ?? this.message.localPreviewUrl;
  }

  get fileIcon(): string {
    return getFileIconName(this.message.metadata?.filename ?? this.message.body);
  }

  get fileSizeLabel(): string {
    const size = this.message.metadata?.size;
    return size ? formatFileSize(size) : '';
  }

  openLightbox(): void {
    if (this.message.messageType === 'image' && this.mediaUrl) {
      this.lightboxOpen = true;
    }
  }

  closeLightbox(): void {
    this.lightboxOpen = false;
  }

  onMediaError(): void {
    this.mediaLoadError.emit();
  }

  textSegments(body: string): ChatTextSegment[] {
    return splitChatTextSegments(body);
  }

  emojiOnly(body: string): boolean {
    return isEmojiOnlyMessage(body);
  }
}
