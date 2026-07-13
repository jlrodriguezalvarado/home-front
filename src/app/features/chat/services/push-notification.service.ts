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
    if (Notification.permission !== 'granted') return;
    await this.subscribe();
  }

  async subscribe(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return false;
      }
      if (Notification.permission !== 'granted') return false;
      const registration = await this.getRegistration();
      const publicKey = await firstValueFrom(this.repo.getVapidPublicKey());
      if (!publicKey) return false;
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !this.hasMatchingApplicationServerKey(subscription, applicationServerKey)) {
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
        platform: this.getPlatform(),
      }));
      return true;
    } catch (error) {
      console.error('Unable to subscribe to push notifications.', error);
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
      console.error('Unable to unsubscribe from push notifications.', error);
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
    } catch (error) {
      console.error('Unable to read push subscription state.', error);
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

  private hasMatchingApplicationServerKey(subscription: PushSubscription, applicationServerKey: Uint8Array): boolean {
    const currentKey = subscription.options.applicationServerKey;
    if (!currentKey) return false;
    const currentBytes = new Uint8Array(currentKey);
    return currentBytes.length === applicationServerKey.length
      && currentBytes.every((value, index) => value === applicationServerKey[index]);
  }

  private getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    return 'web';
  }
}
