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
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') return false;
      const registration = await this.getRegistration();
      const publicKey = await firstValueFrom(this.repo.getVapidPublicKey());
      if (!publicKey) {
        throw new Error('The VAPID public key is not configured');
      }
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && !this.hasApplicationServerKey(subscription, applicationServerKey)) {
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
      console.error('Failed to subscribe to push notifications', error);
      return false;
    }
  }

  async unsubscribe(notifyServer = true): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const registration = await this.getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return false;
      let serverUnsubscribed = true;
      if (notifyServer) {
        try {
          await firstValueFrom(this.repo.unsubscribePushSubscription(subscription.endpoint));
        } catch (error) {
          serverUnsubscribed = false;
          console.error('Failed to remove the push subscription from the server', error);
        }
      }
      const browserUnsubscribed = await subscription.unsubscribe();
      return browserUnsubscribed && serverUnsubscribed;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications', error);
      return false;
    }
  }

  async unsubscribeOnLogout(notifyServer = true): Promise<void> {
    await this.unsubscribe(notifyServer);
  }

  async hasActiveSubscription(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const registration = await this.getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Failed to read the push subscription', error);
      return false;
    }
  }

  private hasApplicationServerKey(subscription: PushSubscription, expectedKey: Uint8Array): boolean {
    const currentKey = subscription.options.applicationServerKey;
    if (!currentKey) return false;
    const currentBytes = new Uint8Array(currentKey);
    return currentBytes.length === expectedKey.length && currentBytes.every((value, index) => value === expectedKey[index]);
  }

  private getPlatform(): string {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return isStandalone ? 'ios-pwa' : 'ios-web';
    if (/Android/.test(navigator.userAgent)) return isStandalone ? 'android-pwa' : 'android-web';
    return isStandalone ? 'web-pwa' : 'web';
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
