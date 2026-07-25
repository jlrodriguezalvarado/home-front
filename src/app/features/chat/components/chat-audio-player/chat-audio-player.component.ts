import {
  Component,
  Input,
  OnDestroy,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

import { formatAudioDuration } from '../../utils/chat-media.utils';

@Component({
  selector: 'app-chat-audio-player',
  standalone: true,
  imports: [],
  templateUrl: './chat-audio-player.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './chat-audio-player.component.scss',
})
export class ChatAudioPlayerComponent implements OnDestroy {
  @Input({ required: true }) src!: string;
  @Input() isOwn = false;
  @Input() durationHint?: number;
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);
  progress = computed(() => {
    const total = this.duration();
    if (!total) return 0;
    return Math.min(100, (this.currentTime() / total) * 100);
  });
  formattedCurrent = computed(() => formatAudioDuration(this.currentTime()));
  formattedDuration = computed(() => {
    const total = this.duration();
    if (total > 0) return formatAudioDuration(total);
    if (this.durationHint != null && this.durationHint > 0)
      return formatAudioDuration(this.durationHint);
    return '0:00';
  });
  private audio: HTMLAudioElement | null = null;

  ngOnDestroy(): void {
    this.destroyAudio();
  }

  togglePlayback(): void {
    if (!this.src) return;
    if (!this.audio) {
      this.audio = new Audio(this.src);
      this.audio.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(this.audio?.duration)) {
          this.duration.set(this.audio?.duration ?? 0);
        }
      });
      this.audio.addEventListener('timeupdate', () => {
        this.currentTime.set(this.audio?.currentTime ?? 0);
      });
      this.audio.addEventListener('ended', () => {
        this.isPlaying.set(false);
        this.currentTime.set(0);
      });
    }
    if (this.isPlaying()) {
      this.audio.pause();
      this.isPlaying.set(false);
      return;
    }
    this.audio
      .play()
      .then(() => this.isPlaying.set(true))
      .catch(() => this.isPlaying.set(false));
  }

  private destroyAudio(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.src = '';
    this.audio = null;
    this.isPlaying.set(false);
    this.currentTime.set(0);
  }
}
