export type NotificationType = 'chat.message' | 'product.listing.updated';

export interface NotificationApi {
  id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  notificationType: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCreatedEvent {
  type: 'notification.created';
  notification: NotificationApi;
}

export interface NotificationUpdatedEvent {
  type: 'notification.updated';
  notification: NotificationApi;
}

export interface CommerceReprocessFinishedEvent {
  type: 'commerce.reprocess.finished';
  commerce_id: string;
  commerce_name: string;
  job_id: string;
  status: string;
  results: Record<string, unknown>;
  error_message: string | null;
}

export interface CommerceReprocessResponse {
  status: string;
  message: string;
  commerce_id: string;
  commerce_name: string;
  strategy?: string;
  job_id?: string;
}

export interface NotificationListParams {
  isRead?: boolean;
  notificationType?: NotificationType;
  perPage?: number;
  page?: number;
}

export interface MarkAllReadResponse {
  updated_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}
