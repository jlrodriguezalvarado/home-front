import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { AppStringKey } from '../../../core/i18n/i18n.service';
import { MediaPermissionService } from '../../../shared/services/media-permission.service';
import {
  createVoiceNoteFile,
  formatAudioDuration,
  getAudioMaxBytes,
  getPreferredAudioMimeType,
} from '../utils/chat-media.utils';

export type VoiceRecordingPhase = 'idle' | 'recording' | 'paused';

const WAVEFORM_SAMPLE_INTERVAL_MS = 100;
const MAX_WAVEFORM_SAMPLES = 120;

@Injectable({ providedIn: 'root' })
export class ChatVoiceRecorderService implements OnDestroy {
  private readonly mediaPermissions = inject(MediaPermissionService);
  phase = signal<VoiceRecordingPhase>('idle');
  durationSeconds = signal(0);
  recordedBytes = signal(0);
  waveformSamples = signal<number[]>([]);
  autoStoppedDueToMaxSize = signal(false);
  errorKey = signal<AppStringKey | null>(null);
  isPreviewPlaying = signal(false);
  previewCurrentTime = signal(0);
  previewDuration = signal(0);
  readonly autoStoppedWithFile$ = new Subject<File>();
  isRecording = computed(() => this.phase() === 'recording');
  isVoiceActive = computed(() => this.phase() !== 'idle');
  playbackProgress = computed(() => {
    const total = this.previewDuration();
    if (!total) return 0;
    return Math.min(1, this.previewCurrentTime() / total);
  });
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private waveformTimer: ReturnType<typeof setInterval> | null = null;
  private chunks: Blob[] = [];
  private mimeType = getPreferredAudioMimeType();
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private segmentStartedAt = 0;
  private elapsedBeforePause = 0;
  private previewAudio: HTMLAudioElement | null = null;
  private previewUrl: string | null = null;
  private readonly maxBytes = getAudioMaxBytes();
  private stopResolve: ((file: File | null) => void) | null = null;
  private isAutoStopping = false;

  ngOnDestroy(): void {
    this.autoStoppedWithFile$.complete();
    this.discardRecording();
  }

  async startRecording(): Promise<boolean> {
    if (this.isVoiceActive()) return true;
    this.errorKey.set(null);
    this.autoStoppedDueToMaxSize.set(false);
    this.isAutoStopping = false;
    this.recordedBytes.set(0);
    this.waveformSamples.set([]);
    this.elapsedBeforePause = 0;
    this.stopPreviewPlayback();
    this.revokePreviewUrl();
    try {
      const hasAccess = await this.mediaPermissions.ensureAccess('microphone');
      if (!hasAccess) {
        this.errorKey.set('chatVoicePermissionDenied');
        this.cleanup();
        return false;
      }
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.setupAnalyser(this.mediaStream);
      this.mimeType = getPreferredAudioMimeType();
      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType: this.mimeType });
      this.chunks = [];
      this.mediaRecorder.ondataavailable = (event) => this.onDataAvailable(event);
      this.mediaRecorder.onstop = () => this.handleRecorderStop();
      this.mediaRecorder.start(200);
      this.segmentStartedAt = Date.now();
      this.durationSeconds.set(0);
      this.startDurationTimer();
      this.startWaveformSampling();
      this.phase.set('recording');
      return true;
    } catch {
      this.errorKey.set('chatVoicePermissionDenied');
      this.cleanup();
      return false;
    }
  }

  pauseRecording(): void {
    if (this.phase() !== 'recording' || !this.mediaRecorder) return;
    this.elapsedBeforePause = this.durationSeconds();
    this.mediaRecorder.pause();
    this.stopDurationTimer();
    this.stopWaveformSampling();
    this.phase.set('paused');
    this.rebuildPreviewUrl();
  }

  async resumeRecording(): Promise<boolean> {
    if (this.phase() !== 'paused' || !this.mediaRecorder) return false;
    this.stopPreviewPlayback();
    this.revokePreviewUrl();
    this.mediaRecorder.resume();
    this.segmentStartedAt = Date.now();
    this.startDurationTimer();
    this.startWaveformSampling();
    this.phase.set('recording');
    return true;
  }

  discardRecording(): void {
    this.stopPreviewPlayback();
    this.stopResolve = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = () => this.cleanup();
      this.mediaRecorder.stop();
      return;
    }
    this.cleanup();
  }

  async stopRecording(): Promise<File | null> {
    return this.finalizeRecording();
  }

  async finalizeRecording(): Promise<File | null> {
    if (!this.isVoiceActive() || !this.mediaRecorder) return null;
    this.stopPreviewPlayback();
    if (this.phase() === 'recording' && this.mediaRecorder.state === 'recording') {
      this.elapsedBeforePause = this.durationSeconds();
      this.mediaRecorder.pause();
      this.stopDurationTimer();
      this.stopWaveformSampling();
      this.phase.set('paused');
    }
    return new Promise<File | null>((resolve) => {
      this.stopResolve = resolve;
      const recorder = this.mediaRecorder;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
        return;
      }
      const file = this.buildFile();
      this.cleanup();
      resolve(file);
    });
  }

  cancelRecording(): void {
    this.discardRecording();
  }

  togglePreviewPlayback(): void {
    if (this.phase() !== 'paused') return;
    if (this.isPreviewPlaying()) {
      this.pausePreviewPlayback();
      return;
    }
    this.playPreview();
  }

  formattedDuration(): string {
    return formatAudioDuration(this.durationSeconds());
  }

  visibleWaveformSamples(maxBars = 48): number[] {
    const samples = this.waveformSamples();
    if (!samples.length) return Array.from({ length: maxBars }, () => 0.08);
    if (samples.length <= maxBars) {
      const padding = maxBars - samples.length;
      return [...Array.from({ length: padding }, () => 0.08), ...samples];
    }
    const step = samples.length / maxBars;
    return Array.from({ length: maxBars }, (_, index) => {
      const sampleIndex = Math.min(samples.length - 1, Math.floor(index * step));
      return samples[sampleIndex];
    });
  }

  private playPreview(): void {
    const url = this.previewUrl ?? this.rebuildPreviewUrl();
    if (!url) return;
    if (!this.previewAudio) {
      this.previewAudio = new Audio(url);
      this.previewAudio.addEventListener('loadedmetadata', () => {
        if (Number.isFinite(this.previewAudio?.duration)) {
          this.previewDuration.set(this.previewAudio?.duration ?? 0);
        }
      });
      this.previewAudio.addEventListener('timeupdate', () => {
        this.previewCurrentTime.set(this.previewAudio?.currentTime ?? 0);
      });
      this.previewAudio.addEventListener('ended', () => {
        this.isPreviewPlaying.set(false);
        this.previewCurrentTime.set(0);
      });
    } else if (this.previewAudio.src !== url) {
      this.previewAudio.src = url;
    }
    this.previewAudio.play()
      .then(() => this.isPreviewPlaying.set(true))
      .catch(() => this.isPreviewPlaying.set(false));
  }

  private pausePreviewPlayback(): void {
    this.previewAudio?.pause();
    this.isPreviewPlaying.set(false);
  }

  private stopPreviewPlayback(): void {
    if (!this.previewAudio) return;
    this.previewAudio.pause();
    this.previewAudio.src = '';
    this.previewAudio = null;
    this.isPreviewPlaying.set(false);
    this.previewCurrentTime.set(0);
    this.previewDuration.set(0);
  }

  private rebuildPreviewUrl(): string | null {
    this.revokePreviewUrl();
    if (!this.chunks.length) return null;
    const blob = new Blob(this.chunks, { type: this.mimeType.split(';')[0].trim() });
    if (blob.size === 0) return null;
    this.previewUrl = URL.createObjectURL(blob);
    return this.previewUrl;
  }

  private revokePreviewUrl(): void {
    if (!this.previewUrl) return;
    URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
  }

  private setupAnalyser(stream: MediaStream): void {
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
  }

  private startWaveformSampling(): void {
    this.stopWaveformSampling();
    this.waveformTimer = setInterval(() => this.captureWaveformSample(), WAVEFORM_SAMPLE_INTERVAL_MS);
  }

  private stopWaveformSampling(): void {
    if (!this.waveformTimer) return;
    clearInterval(this.waveformTimer);
    this.waveformTimer = null;
  }

  private captureWaveformSample(): void {
    if (!this.analyser) return;
    const buffer = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(buffer);
    let sum = 0;
    for (const value of buffer) {
      const normalized = (value - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / buffer.length);
    const level = Math.min(1, Math.max(0.08, rms * 4));
    this.waveformSamples.update((samples) => {
      const next = [...samples, level];
      if (next.length <= MAX_WAVEFORM_SAMPLES) return next;
      return next.slice(next.length - MAX_WAVEFORM_SAMPLES);
    });
  }

  private startDurationTimer(): void {
    this.stopDurationTimer();
    this.durationTimer = setInterval(() => {
      this.durationSeconds.set(this.elapsedBeforePause + (Date.now() - this.segmentStartedAt) / 1000);
    }, 200);
  }

  private stopDurationTimer(): void {
    if (!this.durationTimer) return;
    clearInterval(this.durationTimer);
    this.durationTimer = null;
  }

  private onDataAvailable(event: BlobEvent): void {
    if (event.data.size <= 0) return;
    this.chunks.push(event.data);
    const totalBytes = this.getTotalRecordedBytes();
    this.recordedBytes.set(totalBytes);
    if (totalBytes < this.maxBytes || this.isAutoStopping) return;
    this.isAutoStopping = true;
    this.autoStoppedDueToMaxSize.set(true);
    this.errorKey.set('chatVoiceMaxSizeReached');
    this.trimChunksToMaxSize();
    this.pauseRecording();
  }

  private handleRecorderStop(): void {
    const file = this.buildFile();
    const resolve = this.stopResolve;
    this.stopResolve = null;
    this.cleanup();
    if (resolve) {
      resolve(file);
      return;
    }
    if (file && this.autoStoppedDueToMaxSize()) {
      this.autoStoppedWithFile$.next(file);
    }
  }

  private buildFile(): File | null {
    if (!this.chunks.length) return null;
    const blob = new Blob(this.chunks, { type: this.mimeType.split(';')[0].trim() });
    if (blob.size === 0) return null;
    return createVoiceNoteFile(blob, this.mimeType);
  }

  private getTotalRecordedBytes(): number {
    return this.chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  }

  private trimChunksToMaxSize(): void {
    let total = 0;
    const trimmed: Blob[] = [];
    for (const chunk of this.chunks) {
      if (total + chunk.size <= this.maxBytes) {
        trimmed.push(chunk);
        total += chunk.size;
        continue;
      }
      const remaining = this.maxBytes - total;
      if (remaining > 0) {
        trimmed.push(chunk.slice(0, remaining));
        total += remaining;
      }
      break;
    }
    this.chunks = trimmed;
    this.recordedBytes.set(total);
  }

  private cleanup(): void {
    this.stopDurationTimer();
    this.stopWaveformSampling();
    this.stopPreviewPlayback();
    this.revokePreviewUrl();
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
    this.chunks = [];
    this.phase.set('idle');
    this.durationSeconds.set(0);
    this.recordedBytes.set(0);
    this.waveformSamples.set([]);
    this.elapsedBeforePause = 0;
    this.isAutoStopping = false;
  }
}
