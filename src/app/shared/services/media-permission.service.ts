import { Injectable, signal } from '@angular/core';

export type MediaPermissionKind = 'camera' | 'microphone';
export type MediaPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

@Injectable({ providedIn: 'root' })
export class MediaPermissionService {
  cameraState = signal<MediaPermissionState>('prompt');
  microphoneState = signal<MediaPermissionState>('prompt');
  private permissionStatusByKind = new Map<MediaPermissionKind, PermissionStatus>();

  isSupported(): boolean {
    return typeof navigator !== 'undefined'
      && !!navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === 'function';
  }

  getState(kind: MediaPermissionKind): MediaPermissionState {
    return kind === 'camera' ? this.cameraState() : this.microphoneState();
  }

  isGranted(kind: MediaPermissionKind): boolean {
    return this.getState(kind) === 'granted';
  }

  async refreshStates(): Promise<void> {
    if (!this.isSupported()) {
      this.cameraState.set('unsupported');
      this.microphoneState.set('unsupported');
      return;
    }
    const [camera, microphone] = await Promise.all([
      this.queryPermissionState('camera'),
      this.queryPermissionState('microphone'),
    ]);
    this.cameraState.set(camera);
    this.microphoneState.set(microphone);
  }

  markGranted(kind: MediaPermissionKind): void {
    this.setState(kind, 'granted');
  }

  async requestPermission(kind: MediaPermissionKind): Promise<MediaPermissionState> {
    if (!this.isSupported()) {
      this.setState(kind, 'unsupported');
      return 'unsupported';
    }
    // Prefer the simplest constraints on iOS/WebKit. Facing-mode ideals and
    // resolution targets often cause NotReadableError after a grant.
    const constraints: MediaStreamConstraints = kind === 'camera'
      ? { video: true }
      : { audio: true };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      for (const track of stream.getTracks()) {
        track.stop();
      }
      this.setState(kind, 'granted');
      // Permissions API is unreliable on iOS; keep local granted state.
      void this.refreshStates().catch(() => undefined);
      return 'granted';
    } catch {
      await this.refreshStates();
      const state = this.getState(kind);
      if (state === 'prompt' || state === 'granted') {
        this.setState(kind, 'denied');
        return 'denied';
      }
      return state;
    }
  }

  async ensureAccess(kind: MediaPermissionKind): Promise<boolean> {
    if (!this.isSupported()) return false;
    await this.refreshStates();
    if (this.isGranted(kind)) return true;
    if (this.getState(kind) === 'denied') return false;
    // For microphone, a short grant is fine. Camera streams should be opened
    // by the consumer itself on iOS to avoid stop/restart races.
    if (kind === 'camera') {
      return true;
    }
    return (await this.requestPermission(kind)) === 'granted';
  }

  private async queryPermissionState(kind: MediaPermissionKind): Promise<MediaPermissionState> {
    if (!this.isSupported()) return 'unsupported';
    if (!navigator.permissions?.query) return this.getState(kind);
    try {
      const status = await navigator.permissions.query({ name: kind as PermissionName });
      this.bindPermissionStatus(kind, status);
      return this.mapPermissionStatus(status.state);
    } catch {
      return this.getState(kind);
    }
  }

  private bindPermissionStatus(kind: MediaPermissionKind, status: PermissionStatus): void {
    const previous = this.permissionStatusByKind.get(kind);
    if (previous === status) return;
    this.permissionStatusByKind.set(kind, status);
    status.onchange = () => {
      this.setState(kind, this.mapPermissionStatus(status.state));
    };
  }

  private mapPermissionStatus(state: PermissionState): MediaPermissionState {
    if (state === 'granted') return 'granted';
    if (state === 'denied') return 'denied';
    return 'prompt';
  }

  private setState(kind: MediaPermissionKind, state: MediaPermissionState): void {
    if (kind === 'camera') {
      this.cameraState.set(state);
      return;
    }
    this.microphoneState.set(state);
  }
}
