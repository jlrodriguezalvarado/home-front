import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ChatRepository } from '../repositories/chat.repository';
import { urlBase64ToUint8Array } from '../utils/vapid.util';

const SW_SCRIPT = '/sw.js';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly repo = inject(ChatRepository);
  private registration: ServiceWorkerRegistration | null = null;

  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  async registerAfterLogin(): Promise<void> {
    if (!this.isSupported()) return;
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') return;
    await this.subscribe();
  }

  async subscribe(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const registration = await this.getRegistration();
      const publicKey = await firstValueFrom(this.repo.getVapidPublicKey());
      if (!publicKey) return false;
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      let subscription = await registration.pushManager.getSubscription();
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
        platform: 'web',
      }));
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
    let registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) {
      registration = await navigator.serviceWorker.register(SW_SCRIPT, { scope: '/' });
    }
    this.registration = await navigator.serviceWorker.ready;
    return this.registration ?? registration;
  }
}
