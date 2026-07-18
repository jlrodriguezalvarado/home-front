import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PaginatedResponse } from '../../../core/api/models';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import {
  ChatMessage,
  ChatUserSummary,
  Conversation,
  ConversationPayload,
  ChatMessagesPage,
  PeerDisplayNameListResponse,
  PeerDisplayNameResponse,
  PushSubscriptionPayload,
  SendMessageRequest,
} from '../models/chat.models';
import {
  mapChatMessageFromApi,
  mapChatUserSummaryFromApi,
  mapConversationFromApi,
  mapConversationPayloadToApi,
  mapChatMessagesPageFromApi,
  mapPeerDisplayNameFromApi,
  mapPeerDisplayNameListFromApi,
  mapPushSubscriptionPayloadToApi,
  mapSendMessageRequestToApi,
} from '../mappers/chat.mapper';

@Injectable({ providedIn: 'root' })
export class ChatRepository {
  private readonly api = inject(ApiService);

  listConversations(params?: Record<string, string | number | boolean>): Observable<Conversation[]> {
    return this.api
      .get<unknown[] | PaginatedResponse<unknown>>(API_ENDPOINTS.chat.conversations.list, { params })
      .pipe(
        map((response) => {
          const items = Array.isArray(response) ? response : (response.results ?? []);
          return items.map(mapConversationFromApi);
        }),
      );
  }

  getConversation(id: string): Observable<Conversation> {
    return this.api
      .get<unknown>(API_ENDPOINTS.chat.conversations.detail(id))
      .pipe(map(mapConversationFromApi));
  }

  createConversation(payload: ConversationPayload): Observable<Conversation> {
    return this.api
      .post<unknown>(API_ENDPOINTS.chat.conversations.list, mapConversationPayloadToApi(payload))
      .pipe(map(mapConversationFromApi));
  }

  updateConversation(id: string, payload: Partial<ConversationPayload>): Observable<Conversation> {
    const body: Record<string, unknown> = {};
    if (payload.title !== undefined) body['title'] = payload.title;
    if (payload.isGroup !== undefined) body['is_group'] = payload.isGroup;
    if (payload.participantIds !== undefined) body['participant_ids'] = payload.participantIds;
    return this.api
      .patch<unknown>(API_ENDPOINTS.chat.conversations.detail(id), body)
      .pipe(map(mapConversationFromApi));
  }

  deleteConversation(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.chat.conversations.detail(id));
  }

  listMessages(conversationId: string, params?: Record<string, string | number | boolean>): Observable<ChatMessage[]> {
    return this.listMessagesPage(conversationId, params).pipe(map((page) => page.results));
  }

  listMessagesPage(
    conversationId: string,
    params?: Record<string, string | number | boolean>,
  ): Observable<ChatMessagesPage> {
    return this.api
      .get<unknown>(API_ENDPOINTS.chat.conversations.messages(conversationId), { params })
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return {
              hasMore: false,
              nextBefore: null,
              results: response.map(mapChatMessageFromApi),
            };
          }
          const data = response as Record<string, unknown>;
          if (Array.isArray(data['results'])) {
            return mapChatMessagesPageFromApi(response);
          }
          return { hasMore: false, nextBefore: null, results: [] };
        }),
      );
  }

  sendMessage(conversationId: string, payload: SendMessageRequest): Observable<ChatMessage> {
    return this.api
      .post<unknown>(
        API_ENDPOINTS.chat.conversations.messages(conversationId),
        mapSendMessageRequestToApi(payload),
      )
      .pipe(map(mapChatMessageFromApi));
  }

  markAsRead(conversationId: string): Observable<void> {
    return this.api.post<void>(API_ENDPOINTS.chat.conversations.markRead(conversationId), {});
  }

  setPeerDisplayName(
    conversationId: string,
    targetUserId: string,
    displayName: string,
  ): Observable<PeerDisplayNameResponse> {
    return this.api
      .put<unknown>(
        API_ENDPOINTS.chat.conversations.peerDisplayName(conversationId, targetUserId),
        { display_name: displayName },
      )
      .pipe(map(mapPeerDisplayNameFromApi));
  }

  clearPeerDisplayName(
    conversationId: string,
    targetUserId: string,
  ): Observable<PeerDisplayNameResponse> {
    return this.api
      .delete<unknown>(API_ENDPOINTS.chat.conversations.peerDisplayName(conversationId, targetUserId))
      .pipe(map(mapPeerDisplayNameFromApi));
  }

  listPeerDisplayNames(conversationId: string): Observable<PeerDisplayNameListResponse> {
    return this.api
      .get<unknown>(API_ENDPOINTS.chat.conversations.peerDisplayNames(conversationId))
      .pipe(map(mapPeerDisplayNameListFromApi));
  }

  listUsers(params?: Record<string, string | number | boolean>): Observable<ChatUserSummary[]> {
    return this.api
      .get<unknown[] | PaginatedResponse<unknown>>(API_ENDPOINTS.chat.users.list, { params })
      .pipe(
        map((response) => {
          const items = Array.isArray(response) ? response : (response.results ?? []);
          return items.map(mapChatUserSummaryFromApi);
        }),
      );
  }

  getVapidPublicKey(): Observable<string> {
    return this.api.get<unknown>(API_ENDPOINTS.chat.pushSubscriptions.vapidPublicKey).pipe(
      map((response) => {
        if (typeof response === 'string') return response;
        const data = response as Record<string, unknown>;
        return String(data['public_key'] ?? data['publicKey'] ?? data['vapid_public_key'] ?? '');
      }),
    );
  }

  savePushSubscription(payload: PushSubscriptionPayload): Observable<void> {
    return this.api.post<void>(
      API_ENDPOINTS.chat.pushSubscriptions.create,
      mapPushSubscriptionPayloadToApi(payload),
    );
  }

  unsubscribePushSubscription(endpoint: string): Observable<void> {
    return this.api.post<void>(API_ENDPOINTS.chat.pushSubscriptions.unsubscribe, { endpoint });
  }
}
