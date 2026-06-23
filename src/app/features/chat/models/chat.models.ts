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

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: ChatUserSummary;
  senderId: string;
  senderName?: string;
  body: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  metadata: Record<string, unknown>;
  clientMessageId: string;
  isDeleted: boolean;
  createdAt: string;
}

export type ChatMessageStatus = 'pending' | 'sent' | 'failed';

export interface ChatMessageItem {
  id?: string;
  clientMessageId: string;
  body: string;
  sender: string;
  senderName?: string;
  createdAt: Date;
  status: ChatMessageStatus;
  isOwn: boolean;
}

export interface ChatMessagesPage {
  hasMore: boolean;
  nextBefore: string | null;
  results: ChatMessage[];
}

export interface SendMessageRequest {
  body: string;
  messageType: 'text' | 'image' | 'file';
  metadata?: Record<string, unknown>;
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
  messageType: 'text' | 'image' | 'file';
  metadata: Record<string, unknown>;
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
      type: 'error';
      message: string;
    };

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
