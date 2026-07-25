import {
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';

import { I18nService } from '../../../../core/i18n/i18n.service';
import { ChatVoiceRecorderService } from '../../services/chat-voice-recorder.service';

@Component({
  selector: 'app-chat-voice-recorder-bar',
  standalone: true,
  imports: [],
  templateUrl: './chat-voice-recorder-bar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './chat-voice-recorder-bar.component.scss',
})
export class ChatVoiceRecorderBarComponent {
  @Output() sendVoice = new EventEmitter<void>();
  @Output() discardVoice = new EventEmitter<void>();
  i18n = inject(I18nService);
  voiceRecorder = inject(ChatVoiceRecorderService);
  waveformBars = computed(() => this.voiceRecorder.visibleWaveformSamples(52));
  playedBarCount = computed(() => {
    const progress = this.voiceRecorder.playbackProgress();
    return Math.floor(progress * this.waveformBars().length);
  });

  onDiscard(): void {
    this.discardVoice.emit();
  }

  onPause(): void {
    this.voiceRecorder.pauseRecording();
  }

  onResumeRecording(): void {
    void this.voiceRecorder.resumeRecording();
  }

  onTogglePreview(): void {
    this.voiceRecorder.togglePreviewPlayback();
  }

  onSend(): void {
    this.sendVoice.emit();
  }
}
