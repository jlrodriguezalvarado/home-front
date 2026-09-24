import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  effect,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import 'emoji-picker-element';
import enEmojiI18n from 'emoji-picker-element/i18n/en';
import esEmojiI18n from 'emoji-picker-element/i18n/es';
import { I18nService, AppStringKey } from '../../../../core/i18n/i18n.service';
import { ThemeService } from '../../../../core/theme/theme.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { ChatVoiceRecorderService } from '../../services/chat-voice-recorder.service';
import { ChatRecentEmojiService } from '../../services/chat-recent-emoji.service';
import { ChatVoiceRecorderBarComponent } from '../chat-voice-recorder-bar/chat-voice-recorder-bar.component';
import {
  CHAT_MEDIA_FILE_ACCEPT,
  formatAudioDuration,
  formatFileSize,
  validateChatMediaFile,
} from '../../utils/chat-media.utils';

export interface ChatMediaPreview {
  file: File;
  previewUrl?: string;
  messageType: 'image' | 'audio' | 'file';
}

@Component({
  selector: 'app-chat-media-composer',
  standalone: true,
  imports: [FormsModule, ChatVoiceRecorderBarComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './chat-media-composer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './chat-media-composer.component.scss',
})
export class ChatMediaComposerComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('messageTextarea') messageTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('emojiPicker') emojiPicker?: ElementRef<{ i18n: unknown; locale: string }>;
  @Input() message = '';
  @Output() messageChange = new EventEmitter<string>();
  @Output() sendText = new EventEmitter<void>();
  @Output() sendMedia = new EventEmitter<ChatMediaPreview>();
  @Output() cancelPreview = new EventEmitter<void>();
  i18n = inject(I18nService);
  theme = inject(ThemeService);
  toast = inject(ToastService);
  voiceRecorder = inject(ChatVoiceRecorderService);
  recentEmojiService = inject(ChatRecentEmojiService);
  private elementRef = inject(ElementRef<HTMLElement>);
  preview = signal<ChatMediaPreview | null>(null);
  emojiPickerOpen = signal(false);
  private autoStopToastShown = false;
  private readonly destroy$ = new Subject<void>();
  readonly fileAccept = CHAT_MEDIA_FILE_ACCEPT;

  constructor() {
    effect(() => {
      this.emojiPickerOpen();
      const picker = this.emojiPicker?.nativeElement;
      if (!picker) return;
      const base = this.i18n.lang() === 'es' ? esEmojiI18n : enEmojiI18n;
      picker.i18n = {
        ...base,
        favoritesLabel: this.i18n.t('chatRecentEmojis'),
      };
      picker.locale = this.i18n.lang();
    });
    effect(() => {
      const autoStopped = this.voiceRecorder.autoStoppedDueToMaxSize();
      const phase = this.voiceRecorder.phase();
      if (!autoStopped || phase !== 'paused' || this.autoStopToastShown) return;
      this.autoStopToastShown = true;
      this.toast.info(this.i18n.t('chatVoiceMaxSizeReached'));
    });
    effect(() => {
      if (this.voiceRecorder.phase() === 'idle') {
        this.autoStopToastShown = false;
      }
    });
  }

  ngOnInit(): void {
    this.voiceRecorder.autoStoppedWithFile$.pipe(takeUntil(this.destroy$)).subscribe((file) => {
      this.toast.info(this.i18n.t('chatVoiceMaxSizeReached'));
      this.sendVoiceFile(file);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearPreview();
    if (this.voiceRecorder.isVoiceActive()) {
      this.voiceRecorder.discardRecording();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.emojiPickerOpen()) return;
    const target = event.target as Node;
    if (this.elementRef.nativeElement.contains(target)) return;
    this.emojiPickerOpen.set(false);
  }

  hasText(): boolean {
    return this.message.trim().length > 0;
  }

  openFilePicker(): void {
    this.emojiPickerOpen.set(false);
    this.fileInput?.nativeElement.click();
  }

  toggleEmojiPicker(event: Event): void {
    event.stopPropagation();
    this.emojiPickerOpen.update((open) => !open);
  }

  onEmojiSelected(event: Event): void {
    const customEvent = event as CustomEvent<{ unicode: string }>;
    const emoji = customEvent.detail?.unicode;
    if (!emoji) return;
    this.insertEmoji(emoji);
  }

  insertRecentEmoji(emoji: string): void {
    this.insertEmoji(emoji);
  }

  private insertEmoji(emoji: string): void {
    this.recentEmojiService.add(emoji);
    this.onMessageChange(this.message + emoji);
  }

  onMessageChange(value: string): void {
    this.messageChange.emit(value);
    this.resizeTextarea();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.hasText()) {
        this.sendText.emit();
      }
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.setPreviewFromFile(file);
  }

  async onMicClick(): Promise<void> {
    if (this.voiceRecorder.isVoiceActive()) return;
    this.emojiPickerOpen.set(false);
    const started = await this.voiceRecorder.startRecording();
    const errorKey = this.voiceRecorder.errorKey();
    if (!started && errorKey) {
      this.toast.error(this.i18n.t(errorKey as AppStringKey));
    }
  }

  onSendClick(): void {
    this.emojiPickerOpen.set(false);
    this.sendText.emit();
  }

  onDiscardVoice(): void {
    this.voiceRecorder.discardRecording();
  }

  async onSendVoice(): Promise<void> {
    const file = await this.voiceRecorder.finalizeRecording();
    if (!file) {
      this.toast.error(this.i18n.t('chatVoiceTooShort'));
      return;
    }
    this.sendVoiceFile(file);
  }

  confirmPreview(): void {
    const current = this.preview();
    if (!current) return;
    this.sendMedia.emit(current);
    this.clearPreview();
  }

  dismissPreview(): void {
    this.clearPreview();
    this.cancelPreview.emit();
  }

  previewSizeLabel(file: File): string {
    return formatFileSize(file.size);
  }

  previewDurationLabel(seconds: number): string {
    return formatAudioDuration(seconds);
  }

  private sendVoiceFile(file: File): void {
    this.sendMedia.emit({
      file,
      messageType: 'audio',
    });
  }

  private setPreviewFromFile(file: File): void {
    const validation = validateChatMediaFile(file);
    if (!validation.valid || !validation.messageType) {
      this.toast.error(this.i18n.t(validation.errorKey ?? 'chatMediaTypeNotSupported'));
      return;
    }
    const previewUrl = validation.messageType === 'image' ? URL.createObjectURL(file) : undefined;
    this.clearPreview();
    this.preview.set({
      file,
      previewUrl,
      messageType: validation.messageType,
    });
  }

  private clearPreview(): void {
    const current = this.preview();
    if (current?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(current.previewUrl);
    }
    this.preview.set(null);
  }

  private resizeTextarea(): void {
    const textarea = this.messageTextarea?.nativeElement;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }
}
