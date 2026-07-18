import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService, AppStringKey } from '../../core/i18n/i18n.service';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { AppNotification } from '../../core/notifications/notifications.models';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-panel.component.html',
  styleUrl: './notification-panel.component.scss',
})
export class NotificationPanelComponent {
  i18n = inject(I18nService);
  notifications = inject(NotificationsService);

  t(key: AppStringKey) {
    return this.i18n.t(key);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-notification-panel-root]')) {
      this.notifications.closePanel();
    }
  }

  onNotificationClick(notification: AppNotification, event: MouseEvent): void {
    event.stopPropagation();
    this.notifications.markRead(notification);
  }

  onMarkAllRead(event: MouseEvent): void {
    event.stopPropagation();
    this.notifications.markAllRead();
  }

  onLoadMore(event: MouseEvent): void {
    event.stopPropagation();
    this.notifications.loadList(false);
  }

  iconFor(notification: AppNotification): string {
    if (notification.notificationType === 'chat.message') return 'chat';
    if (notification.notificationType === 'product.listing.updated') return 'inventory_2';
    if (notification.notificationType === 'reminder.due') return 'alarm';
    return 'notifications';
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(this.i18n.lang(), {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  }
}
