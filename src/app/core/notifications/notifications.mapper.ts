import { AppNotification, NotificationApi } from './notifications.models';

export function mapNotificationFromApi(data: NotificationApi): AppNotification {
  return {
    id: data.id,
    notificationType: data.notification_type,
    title: data.title,
    body: data.body,
    data: data.data ?? {},
    isRead: data.is_read,
    readAt: data.read_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function isNotificationApi(data: Record<string, unknown>): boolean {
  return typeof data['id'] === 'string'
    && typeof data['notification_type'] === 'string'
    && typeof data['title'] === 'string';
}

export function parseNotificationApi(data: Record<string, unknown>): AppNotification | null {
  if (!isNotificationApi(data)) return null;
  return mapNotificationFromApi(data as unknown as NotificationApi);
}
