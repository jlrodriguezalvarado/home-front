import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ChatRepository } from '../repositories/chat.repository';
import { vapidPublicKeyToBufferSource } from '../utils/vapid.util';

const SW_SCRIPT = '/sw.js';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly repo = inject(ChatRepository);
  private registration: ServiceWorkerRegistration | null = null;

  isSupported(): boolean {
    return typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window;
  }

  isIos(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  }

  isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const mediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = 'standalone' in navigator
      && (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return mediaStandalone || iosStandalone;
  }

  /** iOS Web Push only works for Home Screen PWAs (iOS 16.4+). */
  canUsePush(): boolean {
    if (!this.isSupported()) return false;
    if (this.isIos() && !this.isStandalone()) return false;
    return true;
  }

  requiresUserGestureForPermission(): boolean {
    return this.isIos();
  }

  async registerAfterLogin(): Promise<void> {
    if (!this.canUsePush()) return;
    if (Notification.permission === 'granted') {
      await this.subscribe();
      return;
    }
    // iOS Safari/PWA requires a user gesture to prompt for notification permission.
    if (this.requiresUserGestureForPermission()) return;
    if (Notification.permission !== 'default') return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await this.subscribe();
    }
  }

  async subscribe(): Promise<boolean> {
    if (!this.canUsePush()) return false;
    try {
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') return false;
      const registration = await this.getRegistration();
      const publicKey = await firstValueFrom(this.repo.getVapidPublicKey());
      if (!publicKey) {
        console.error('[push] VAPID public key is empty or unavailable');
        return false;
      }
      const applicationServerKey = vapidPublicKeyToBufferSource(publicKey);
      const subscription = await this.ensureSubscription(registration, applicationServerKey);
      if (!subscription) return false;
      const json = subscription.toJSON();
      const keys = json.keys ?? {};
      if (!keys['p256dh'] || !keys['auth']) {
        console.error('[push] Subscription keys missing after PushManager.subscribe');
        return false;
      }
      await firstValueFrom(this.repo.savePushSubscription({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: keys['p256dh'],
          auth: keys['auth'],
        },
        userAgent: navigator.userAgent,
        platform: this.detectPlatform(),
      }));
      return true;
    } catch (error) {
      console.error('[push] Failed to subscribe', error);
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const registration = await this.getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return false;
      await firstValueFrom(this.repo.unsubscribePushSubscription(subscription.endpoint));
      await subscription.unsubscribe();
      return true;
    } catch (error) {
      console.error('[push] Failed to unsubscribe', error);
      return false;
    }
  }

  async unsubscribeOnLogout(): Promise<void> {
    await this.unsubscribe();
  }

  async hasActiveSubscription(): Promise<boolean> {
    if (!this.canUsePush()) return false;
    try {
      const registration = await this.getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription && Notification.permission === 'granted';
    } catch {
      return false;
    }
  }

  private detectPlatform(): string {
    if (this.isIos()) return 'ios';
    if (/Android/i.test(navigator.userAgent)) return 'android';
    return 'web';
  }

  private async ensureSubscription(
    registration: ServiceWorkerRegistration,
    applicationServerKey: BufferSource,
  ): Promise<PushSubscription | null> {
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      try {
        // Returns existing subscription when VAPID key matches; throws when it changed.
        return await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch {
        await subscription.unsubscribe();
        subscription = null;
      }
    }
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  private async getRegistration(): Promise<ServiceWorkerRegistration> {
    if (this.registration) return this.registration;
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported');
    }
    let registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      registration = await navigator.serviceWorker.register(SW_SCRIPT, { scope: '/' });
    }
    this.registration = await navigator.serviceWorker.ready;
    return this.registration ?? registration;
  }
}
