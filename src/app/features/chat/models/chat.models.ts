export interface ChatUserSummary {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface ConversationParticipant {
  id: string;
  user: ChatUserSummary;
  displayName: string;
  customDisplayName: string | null;
  lastReadAt: string | null;
  isMuted: boolean;
  isArchived: boolean;
}

export interface PeerDisplayNameResponse {
  targetUserId: string;
  customDisplayName: string | null;
  displayName: string;
  defaultDisplayName: string;
}

export interface PeerDisplayNameListResponse {
  results: PeerDisplayNameResponse[];
}

export interface ChatMessageMetadata {
  storageKey: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
  duration?: number;
}

export interface ChatMediaUploadResponse {
  messageType: 'image' | 'audio' | 'file';
  metadata: ChatMessageMetadata;
  url: string;
}

export type ChatMessageType = 'text' | 'image' | 'audio' | 'file' | 'system';

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: ChatUserSummary;
  senderId: string;
  senderName?: string;
  body: string;
  messageType: ChatMessageType;
  metadata: ChatMessageMetadata | Record<string, unknown>;
  clientMessageId: string;
  isDeleted: boolean;
  createdAt: string;
}

export type ChatMessageStatus = 'uploading' | 'pending' | 'sent' | 'failed';

export interface ChatMessageItem {
  id?: string;
  clientMessageId: string;
  body: string;
  messageType: ChatMessageType;
  metadata?: ChatMessageMetadata;
  sender: string;
  senderName?: string;
  createdAt: Date;
  status: ChatMessageStatus;
  isOwn: boolean;
  uploadProgress?: number;
  localPreviewUrl?: string;
  pendingFile?: File;
}

export interface ChatMessagesPage {
  hasMore: boolean;
  nextBefore: string | null;
  results: ChatMessage[];
}

export interface SendMessageRequest {
  body: string;
  messageType: ChatMessageType;
  metadata?: ChatMessageMetadata | Record<string, unknown>;
  clientMessageId: string;
}

export interface Conversation {
  id: string;
  title: string;
  isGroup: boolean;
  participants: ConversationParticipant[];
  lastMessage: ChatMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversationPayload {
  title: string;
  isGroup: boolean;
  participantIds: string[];
}

export interface SendMessagePayload {
  type: 'message.send';
  body: string;
  messageType: ChatMessageType;
  metadata: ChatMessageMetadata | Record<string, unknown>;
  clientMessageId: string;
}

export interface TypingPayload {
  type: 'typing.start' | 'typing.stop';
}

export interface ReadPayload {
  type: 'message.read';
}

export type ChatSocketOutgoingEvent =
  | SendMessagePayload
  | TypingPayload
  | ReadPayload;

export type ChatSocketIncomingEvent =
  | {
      type: 'message.created';
      message: ChatMessage;
    }
  | {
      type: 'message.send.failed';
      clientMessageId: string;
      message: string;
    }
  | {
      type: 'typing.changed';
      userId: string;
      isTyping: boolean;
    }
  | {
      type: 'messages.read';
      userId: string;
      readAt: string;
    }
  | {
      type: 'user.joined';
      userId: string;
    }
  | {
      type: 'user.left';
      userId: string;
    }
  | {
      type: 'presence.snapshot';
      onlineUserIds: string[];
    }
  | {
      type: 'presence.changed';
      userId: string;
      isOnline: boolean;
    }
  | {
      type: 'error';
      message: string;
    };

export interface InboxPresenceEvent {
  conversationId: string;
  userId: string;
  isOnline: boolean;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  platform: string;
}

export interface InboxMessageEvent {
  type: 'conversation.message_created';
  conversationId: string;
  conversationTitle: string;
  isGroup: boolean;
  isMuted: boolean;
  unreadCount: number;
  message: ChatMessage;
}
