import {
  ChatMessage,
  ChatMessageItem,
  ChatMessagesPage,
  ChatSocketIncomingEvent,
  ChatSocketOutgoingEvent,
  ChatUserSummary,
  Conversation,
  ConversationParticipant,
  ConversationPayload,
  InboxMessageEvent,
  PeerDisplayNameListResponse,
  PeerDisplayNameResponse,
  PushSubscriptionPayload,
  SendMessageRequest,
} from '../models/chat.models';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function mapChatUserSummaryFromApi(item: unknown): ChatUserSummary {
  const data = asRecord(item);
  return {
    id: String(data['id'] ?? ''),
    name: String(data['display_name'] ?? data['name'] ?? data['email'] ?? 'Unknown'),
    email: data['email'] != null ? String(data['email']) : undefined,
    avatarUrl: data['avatar_url'] != null || data['avatarUrl'] != null
      ? String(data['avatar_url'] ?? data['avatarUrl'])
      : null,
  };
}

export function mapConversationParticipantFromApi(item: unknown): ConversationParticipant {
  const data = asRecord(item);
  const user = mapChatUserSummaryFromApi(data['user']);
  const customRaw = data['custom_display_name'] ?? data['customDisplayName'];
  const displayNameRaw = data['display_name'] ?? data['displayName'];
  return {
    id: String(data['id'] ?? ''),
    user,
    displayName: displayNameRaw != null ? String(displayNameRaw) : user.name,
    customDisplayName: customRaw != null ? String(customRaw) : null,
    lastReadAt: data['last_read_at'] != null || data['lastReadAt'] != null
      ? String(data['last_read_at'] ?? data['lastReadAt'])
      : null,
    isMuted: Boolean(data['is_muted'] ?? data['isMuted'] ?? false),
    isArchived: Boolean(data['is_archived'] ?? data['isArchived'] ?? false),
  };
}

export function mapChatMessageFromApi(item: unknown): ChatMessage {
  const data = asRecord(item);
  const senderRaw = data['sender'];
  const senderId = senderRaw != null && typeof senderRaw === 'object'
    ? String((senderRaw as Record<string, unknown>)['id'] ?? '')
    : String(data['sender_id'] ?? data['senderId'] ?? senderRaw ?? '');
  const sender = senderRaw != null && typeof senderRaw === 'object'
    ? mapChatUserSummaryFromApi(senderRaw)
    : mapChatUserSummaryFromApi({ id: senderId, name: String(data['sender_name'] ?? senderId) });
  const senderNameRaw = data['sender_name'] ?? data['senderName'];
  const metadata = data['metadata'];
  return {
    id: String(data['id'] ?? ''),
    conversationId: String(data['conversation_id'] ?? data['conversationId'] ?? ''),
    sender,
    senderId,
    senderName: senderNameRaw != null ? String(senderNameRaw) : sender.name,
    body: String(data['body'] ?? ''),
    messageType: (data['message_type'] ?? data['messageType'] ?? 'text') as ChatMessage['messageType'],
    metadata: metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {},
    clientMessageId: String(data['client_message_id'] ?? data['clientMessageId'] ?? ''),
    isDeleted: Boolean(data['is_deleted'] ?? data['isDeleted'] ?? false),
    createdAt: String(data['created_at'] ?? data['createdAt'] ?? ''),
  };
}

export function getConversationDisplayTitle(
  conversation: Conversation,
  _currentUserId?: string | null,
): string {
  return conversation.title;
}

export function mapPeerDisplayNameFromApi(item: unknown): PeerDisplayNameResponse {
  const data = asRecord(item);
  const customRaw = data['custom_display_name'] ?? data['customDisplayName'];
  return {
    targetUserId: String(data['target_user_id'] ?? data['targetUserId'] ?? ''),
    customDisplayName: customRaw != null ? String(customRaw) : null,
    displayName: String(data['display_name'] ?? data['displayName'] ?? ''),
    defaultDisplayName: String(data['default_display_name'] ?? data['defaultDisplayName'] ?? ''),
  };
}

export function mapPeerDisplayNameListFromApi(item: unknown): PeerDisplayNameListResponse {
  const data = asRecord(item);
  const resultsRaw = data['results'];
  const results = Array.isArray(resultsRaw) ? resultsRaw.map(mapPeerDisplayNameFromApi) : [];
  return { results };
}

export function applyPeerDisplayNameToConversation(
  conversation: Conversation,
  targetUserId: string,
  response: PeerDisplayNameResponse,
): Conversation {
  const participants = conversation.participants.map((participant) =>
    participant.user.id === targetUserId
      ? {
          ...participant,
          displayName: response.displayName,
          customDisplayName: response.customDisplayName,
        }
      : participant,
  );
  return {
    ...conversation,
    title: !conversation.isGroup ? response.displayName : conversation.title,
    participants,
  };
}

export function mapConversationFromApi(item: unknown): Conversation {
  const data = asRecord(item);
  const participantsRaw = data['participants'];
  const participants = Array.isArray(participantsRaw)
    ? participantsRaw.map(mapConversationParticipantFromApi)
    : [];
  const lastMessageRaw = data['last_message'] ?? data['lastMessage'];
  return {
    id: String(data['id'] ?? ''),
    title: String(data['title'] ?? ''),
    isGroup: Boolean(data['is_group'] ?? data['isGroup'] ?? false),
    participants,
    lastMessage: lastMessageRaw ? mapChatMessageFromApi(lastMessageRaw) : null,
    lastMessageAt: data['last_message_at'] != null || data['lastMessageAt'] != null
      ? String(data['last_message_at'] ?? data['lastMessageAt'])
      : null,
    unreadCount: Number(data['unread_count'] ?? data['unreadCount'] ?? 0),
    createdAt: data['created_at'] != null ? String(data['created_at']) : undefined,
    updatedAt: data['updated_at'] != null ? String(data['updated_at']) : undefined,
  };
}

export function mapChatMessagesPageFromApi(item: unknown): ChatMessagesPage {
  const data = asRecord(item);
  const resultsRaw = data['results'];
  const results = Array.isArray(resultsRaw) ? resultsRaw.map(mapChatMessageFromApi) : [];
  return {
    hasMore: Boolean(data['has_more'] ?? data['hasMore'] ?? false),
    nextBefore: data['next_before'] != null || data['nextBefore'] != null
      ? String(data['next_before'] ?? data['nextBefore'])
      : null,
    results,
  };
}

export function mapSendMessageRequestToApi(payload: SendMessageRequest): Record<string, unknown> {
  return {
    body: payload.body,
    message_type: payload.messageType,
    metadata: payload.metadata ?? {},
    client_message_id: payload.clientMessageId,
  };
}

export function chatMessageToItem(
  message: ChatMessage,
  currentUserId: string,
  status: ChatMessageItem['status'] = 'sent',
): ChatMessageItem {
  return {
    id: message.id,
    clientMessageId: message.clientMessageId || message.id,
    body: message.body,
    sender: message.senderId,
    senderName: message.senderName ?? message.sender.name,
    createdAt: new Date(message.createdAt),
    status,
    isOwn: message.senderId === currentUserId,
  };
}

export function mergeChatMessageItem(
  existing: ChatMessageItem,
  incoming: Partial<ChatMessageItem>,
): ChatMessageItem {
  return {
    ...existing,
    ...incoming,
    clientMessageId: existing.clientMessageId,
  };
}

export function findChatMessageIndex(
  messages: ChatMessageItem[],
  id?: string,
  clientMessageId?: string,
): number {
  return messages.findIndex((message) =>
    (id && message.id === id)
    || (clientMessageId && message.clientMessageId === clientMessageId),
  );
}

export function mapChatSocketEventFromApi(item: unknown): ChatSocketIncomingEvent {
  const data = asRecord(item);
  const type = String(data['type'] ?? 'error');
  switch (type) {
    case 'message.created': {
      const messageRaw = data['message'] ?? data;
      return {
        type: 'message.created',
        message: mapChatMessageFromApi(messageRaw),
      };
    }
    case 'message.send.failed':
      return {
        type: 'message.send.failed',
        clientMessageId: String(data['client_message_id'] ?? data['clientMessageId'] ?? ''),
        message: String(data['message'] ?? ''),
      };
    case 'typing.changed':
      return {
        type: 'typing.changed',
        userId: String(data['user_id'] ?? data['userId'] ?? ''),
        isTyping: Boolean(data['is_typing'] ?? data['isTyping'] ?? false),
      };
    case 'messages.read':
      return {
        type: 'messages.read',
        userId: String(data['user_id'] ?? data['userId'] ?? ''),
        readAt: String(data['read_at'] ?? data['readAt'] ?? ''),
      };
    case 'user.joined':
      return {
        type: 'user.joined',
        userId: String(data['user_id'] ?? data['userId'] ?? ''),
      };
    case 'user.left':
      return {
        type: 'user.left',
        userId: String(data['user_id'] ?? data['userId'] ?? ''),
      };
    default:
      return {
        type: 'error',
        message: String(data['message'] ?? 'Unknown socket error'),
      };
  }
}

export function mapConversationPayloadToApi(payload: ConversationPayload): Record<string, unknown> {
  return {
    title: payload.title,
    is_group: payload.isGroup,
    participant_ids: payload.participantIds,
  };
}

export function mapPushSubscriptionPayloadToApi(payload: PushSubscriptionPayload): Record<string, unknown> {
  return {
    endpoint: payload.endpoint,
    keys: {
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
    },
    user_agent: payload.userAgent,
    platform: payload.platform,
  };
}

export function mapChatSocketOutgoingToApi(event: ChatSocketOutgoingEvent): Record<string, unknown> {
  if (event.type === 'message.send') {
    return {
      type: event.type,
      body: event.body,
      message_type: event.messageType,
      metadata: event.metadata,
      client_message_id: event.clientMessageId,
    };
  }
  return { type: event.type };
}

export function mapInboxEventFromApi(item: unknown): InboxMessageEvent | null {
  const data = asRecord(item);
  const type = String(data['type'] ?? '');
  if (type !== 'conversation.message_created') return null;
  const messageRaw = data['message'];
  const message = mapChatMessageFromApi(messageRaw);
  const conversationId = String(
    data['conversation_id'] ?? data['conversationId'] ?? message.conversationId ?? '',
  );
  if (!conversationId) return null;
  return {
    type: 'conversation.message_created',
    conversationId,
    conversationTitle: String(data['conversation_title'] ?? data['conversationTitle'] ?? ''),
    isGroup: Boolean(data['is_group'] ?? data['isGroup'] ?? false),
    isMuted: Boolean(data['is_muted'] ?? data['isMuted'] ?? false),
    unreadCount: Number(data['unread_count'] ?? data['unreadCount'] ?? 0),
    message: {
      ...message,
      conversationId,
    },
  };
}
