import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AppNotification } from './notifications.models';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsWebSocketService } from './notifications-websocket.service';
import { ToastService } from '../../shared/services/toast.service';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly repo = inject(NotificationsRepository);
  private readonly ws = inject(NotificationsWebSocketService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private initialized = false;
  unreadCount = signal(0);
  items = signal<AppNotification[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  error = signal(false);
  panelOpen = signal(false);
  hasMore = signal(false);
  private nextPage = 1;
  private readonly pageSize = 20;

  constructor() {
    this.ws.notificationCreated$
      .pipe(takeUntilDestroyed())
      .subscribe((notification) => this.onNotificationCreated(notification));
    this.ws.notificationUpdated$
      .pipe(takeUntilDestroyed())
      .subscribe((notification) => this.onNotificationUpdated(notification));
  }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.refreshUnreadCount();
  }

  reset(): void {
    this.initialized = false;
    this.unreadCount.set(0);
    this.items.set([]);
    this.loading.set(false);
    this.loadingMore.set(false);
    this.error.set(false);
    this.panelOpen.set(false);
    this.hasMore.set(false);
    this.nextPage = 1;
  }

  openPanel(): void {
    this.panelOpen.set(true);
    this.loadList(true);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  togglePanel(): void {
    if (this.panelOpen()) {
      this.closePanel();
      return;
    }
    this.openPanel();
  }

  refreshUnreadCount(): void {
    this.repo.unreadCount().subscribe({
      next: (count) => this.unreadCount.set(count),
      error: () => this.unreadCount.set(0),
    });
  }

  loadList(reset = false): void {
    if (this.loading() || this.loadingMore()) return;
    if (reset) {
      this.nextPage = 1;
      this.hasMore.set(false);
      this.loading.set(true);
      this.error.set(false);
    } else if (!this.hasMore()) {
      return;
    } else {
      this.loadingMore.set(true);
    }
    this.repo.list({ perPage: this.pageSize, page: this.nextPage, isRead: false }).subscribe({
      next: (res) => {
        const unreadResults = res.results.filter((item) => !item.isRead);
        const merged = reset ? unreadResults : [...this.items(), ...unreadResults];
        this.items.set(merged);
        this.hasMore.set(!!res.next);
        this.nextPage += 1;
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadingMore.set(false);
        if (reset) this.error.set(true);
      },
    });
  }

  markRead(notification: AppNotification): void {
    if (notification.isRead) {
      this.navigateForNotification(notification);
      return;
    }
    this.repo.markRead(notification.id).subscribe({
      next: (updated) => {
        this.removeNotification(updated.id);
        if (this.unreadCount() > 0) {
          this.unreadCount.update((count) => Math.max(0, count - 1));
        }
        this.navigateForNotification(updated);
      },
      error: () => this.navigateForNotification(notification),
    });
  }

  markAllRead(): void {
    this.repo.markAllRead().subscribe({
      next: () => {
        this.unreadCount.set(0);
        this.items.set([]);
      },
    });
  }

  private onNotificationCreated(notification: AppNotification): void {
    if (notification.isRead) return;
    this.upsertNotification(notification);
    this.unreadCount.update((count) => count + 1);
    this.toast.show(notification.title, 'info');
  }

  private onNotificationUpdated(notification: AppNotification): void {
    const previous = this.items().find((item) => item.id === notification.id);
    if (notification.isRead) {
      this.removeNotification(notification.id);
      if (previous && !previous.isRead && this.unreadCount() > 0) {
        this.unreadCount.update((count) => Math.max(0, count - 1));
      }
      return;
    }
    this.upsertNotification(notification);
  }

  private upsertNotification(notification: AppNotification): void {
    if (notification.isRead) {
      this.removeNotification(notification.id);
      return;
    }
    this.items.update((items) => {
      const index = items.findIndex((item) => item.id === notification.id);
      if (index === -1) return [notification, ...items];
      const next = [...items];
      next[index] = notification;
      return next;
    });
  }

  private removeNotification(id: string): void {
    this.items.update((items) => items.filter((item) => item.id !== id));
  }

  private navigateForNotification(notification: AppNotification): void {
    this.closePanel();
    const data = notification.data ?? {};
    const url = data['url'];
    if (typeof url === 'string' && url.trim()) {
      void this.router.navigateByUrl(url);
      return;
    }
    if (notification.notificationType === 'chat.message') {
      const conversationId = data['conversation_id'] ?? data['conversationId'];
      if (conversationId) {
        void this.router.navigate(['/chat/conversations', String(conversationId)]);
      }
      return;
    }
    if (notification.notificationType === 'reminder.due') {
      const reminderId = data['reminder_id'] ?? data['reminderId'];
      void this.router.navigate(reminderId ? ['/notes/reminders', String(reminderId), 'edit'] : ['/notes/reminders']);
      return;
    }
    if (notification.notificationType === 'product.listing.updated') {
      const commerceId = data['commerce_id'] ?? data['commerceId'];
      const productId = data['product_id'] ?? data['productId'];
      const queryParams: Record<string, string> = {};
      if (commerceId) queryParams['commerce'] = String(commerceId);
      if (productId) queryParams['product'] = String(productId);
      void this.router.navigate(['/products'], { queryParams });
    }
  }
}
