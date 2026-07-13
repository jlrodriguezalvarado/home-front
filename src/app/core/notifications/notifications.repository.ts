import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../api/api.service';
import { API_ENDPOINTS } from '../api/endpoints';
import { PaginatedResponse } from '../api/models';
import {
  AppNotification,
  MarkAllReadResponse,
  NotificationApi,
  NotificationListParams,
  UnreadCountResponse,
} from './notifications.models';
import { mapNotificationFromApi } from './notifications.mapper';

@Injectable({ providedIn: 'root' })
export class NotificationsRepository {
  private readonly api = inject(ApiService);

  list(params: NotificationListParams = {}): Observable<PaginatedResponse<AppNotification>> {
    const query: Record<string, string | number | boolean> = {};
    if (params.isRead !== undefined) query['is_read'] = params.isRead;
    if (params.notificationType) query['notification_type'] = params.notificationType;
    if (params.perPage) query['perPage'] = params.perPage;
    if (params.page) query['page'] = params.page;
    return this.api.get<PaginatedResponse<NotificationApi>>(API_ENDPOINTS.notifications.list, { params: query }).pipe(
      map((res) => ({
        count: res.count,
        next: res.next,
        previous: res.previous,
        results: (res.results ?? []).map(mapNotificationFromApi),
      })),
    );
  }

  detail(id: string): Observable<AppNotification> {
    return this.api.get<NotificationApi>(API_ENDPOINTS.notifications.detail(id)).pipe(
      map(mapNotificationFromApi),
    );
  }

  unreadCount(): Observable<number> {
    return this.api.get<UnreadCountResponse>(API_ENDPOINTS.notifications.unreadCount).pipe(
      map((res) => res.unread_count ?? 0),
    );
  }

  markRead(id: string): Observable<AppNotification> {
    return this.api.post<NotificationApi>(API_ENDPOINTS.notifications.markRead(id), {}).pipe(
      map(mapNotificationFromApi),
    );
  }

  markAllRead(): Observable<number> {
    return this.api.post<MarkAllReadResponse>(API_ENDPOINTS.notifications.markAllRead, {}).pipe(
      map((res) => res.updated_count ?? 0),
    );
  }
}
