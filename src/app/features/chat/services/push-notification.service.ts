import { Injectable, inject, isDevMode } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ChatRepository } from '../repositories/chat.repository';
import { urlBase64ToUint8Array } from '../utils/vapid.util';

const SW_SCRIPT = '/sw.js';
const VAPID_STORAGE_KEY = 'home_manager_push_vapid_public_key';

export type PushSubscribeOptions = {
  requestPermission?: boolean;
};

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly repo = inject(ChatRepository);
  private registration: ServiceWorkerRegistration | null = null;

  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  isStandalonePwa(): boolean {
    const nav = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
  }

  detectPlatform(): string {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'web';
  }

  async registerAfterLogin(): Promise<void> {
    if (!this.isSupported()) return;
    if (Notification.permission !== 'granted') return;
    await this.subscribe();
  }

  async subscribe(options?: PushSubscribeOptions): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      if (options?.requestPermission || Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return false;
      } else if (Notification.permission !== 'granted') {
        return false;
      }
      const registration = await this.getRegistration();
      const publicKey = await firstValueFrom(this.repo.getVapidPublicKey());
      if (!publicKey) return false;
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      let subscription = await registration.pushManager.getSubscription();
      const storedVapidKey = localStorage.getItem(VAPID_STORAGE_KEY);
      if (subscription && storedVapidKey && storedVapidKey !== publicKey) {
        await subscription.unsubscribe();
        subscription = null;
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }
      const json = subscription.toJSON();
      const keys = json.keys ?? {};
      await firstValueFrom(this.repo.savePushSubscription({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: keys['p256dh'] ?? '',
          auth: keys['auth'] ?? '',
        },
        userAgent: navigator.userAgent,
        platform: this.detectPlatform(),
      }));
      localStorage.setItem(VAPID_STORAGE_KEY, publicKey);
      return true;
    } catch {
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
      localStorage.removeItem(VAPID_STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  async unsubscribeOnLogout(): Promise<void> {
    await this.unsubscribe();
  }

  async hasActiveSubscription(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const registration = await this.getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch {
      return false;
    }
  }

  private async getRegistration(): Promise<ServiceWorkerRegistration> {
    if (this.registration) return this.registration;
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported');
    }
    if (!isDevMode()) {
      this.registration = await navigator.serviceWorker.ready;
      return this.registration;
    }
    let registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      registration = await navigator.serviceWorker.register(SW_SCRIPT, { scope: '/' });
    }
    this.registration = await navigator.serviceWorker.ready;
    return this.registration ?? registration;
  }
}
