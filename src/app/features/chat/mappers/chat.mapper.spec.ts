import {
  mapChatMessageFromApi,
  mapChatSocketEventFromApi,
  mapInboxEventFromApi,
  mapChatSocketOutgoingToApi,
  mapChatMessagesPageFromApi,
  mapConversationFromApi,
  getConversationDisplayTitle,
  mapConversationPayloadToApi,
  mapPushSubscriptionPayloadToApi,
  mapPeerDisplayNameFromApi,
  applyPeerDisplayNameToConversation,
} from './chat.mapper';

describe('chat.mapper', () => {
  it('should map conversation from API snake_case', () => {
    const result = mapConversationFromApi({
      id: 'conv-1',
      title: 'Team chat',
      is_group: true,
      participants: [{
        id: 'part-1',
        user: { id: 'user-1', name: 'Alice', email: 'alice@test.com' },
        last_read_at: '2024-01-01T10:00:00Z',
        is_muted: false,
        is_archived: false,
      }],
      last_message: {
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender: { id: 'user-1', name: 'Alice' },
        body: 'Hello',
        message_type: 'text',
        metadata: {},
        client_message_id: 'client-1',
        is_deleted: false,
        created_at: '2024-01-01T10:01:00Z',
      },
      last_message_at: '2024-01-01T10:01:00Z',
      unread_count: 2,
    });
    expect(result.id).toBe('conv-1');
    expect(result.isGroup).toBe(true);
    expect(result.unreadCount).toBe(2);
    expect(result.participants[0].user.name).toBe('Alice');
    expect(result.lastMessage?.body).toBe('Hello');
  });

  it('should map message with sender as ID', () => {
    const result = mapChatMessageFromApi({
      id: 'msg-2',
      conversation_id: 'conv-1',
      sender_id: 'user-2',
      body: 'Hi',
      message_type: 'text',
      metadata: { key: 'value' },
      client_message_id: 'client-2',
      is_deleted: false,
      created_at: '2024-01-02T10:00:00Z',
    });
    expect(result.senderId).toBe('user-2');
    expect(result.sender.id).toBe('user-2');
    expect(result.metadata).toEqual({ key: 'value' });
  });

  it('should map socket incoming message.created event', () => {
    const result = mapChatSocketEventFromApi({
      type: 'message.created',
      message: {
        id: 'msg-3',
        conversation_id: 'conv-1',
        sender: { id: 'user-1', name: 'Alice' },
        body: 'Ping',
        message_type: 'text',
        metadata: {},
        client_message_id: 'client-3',
        is_deleted: false,
        created_at: '2024-01-03T10:00:00Z',
      },
    });
    expect(result.type).toBe('message.created');
    if (result.type === 'message.created') {
      expect(result.message.body).toBe('Ping');
    }
  });

  it('should map socket incoming message.created event with flat payload', () => {
    const result = mapChatSocketEventFromApi({
      type: 'message.created',
      id: 'msg-4',
      conversation_id: 'conv-1',
      sender: { id: 'user-1', name: 'Alice' },
      body: 'Flat',
      message_type: 'text',
      metadata: {},
      client_message_id: 'client-4',
      is_deleted: false,
      created_at: '2024-01-04T10:00:00Z',
    });
    expect(result.type).toBe('message.created');
    if (result.type === 'message.created') {
      expect(result.message.body).toBe('Flat');
    }
  });

  it('should map socket incoming message.send.failed event', () => {
    const result = mapChatSocketEventFromApi({
      type: 'message.send.failed',
      client_message_id: 'client-5',
      message: 'Rejected',
    });
    expect(result).toEqual({
      type: 'message.send.failed',
      clientMessageId: 'client-5',
      message: 'Rejected',
    });
  });

  it('should map paginated messages page from API', () => {
    const result = mapChatMessagesPageFromApi({
      has_more: true,
      next_before: 'msg-oldest',
      results: [{
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_id: 'user-1',
        body: 'Hello',
        message_type: 'text',
        metadata: {},
        client_message_id: 'client-1',
        is_deleted: false,
        created_at: '2024-01-01T10:00:00Z',
      }],
    });
    expect(result.hasMore).toBe(true);
    expect(result.nextBefore).toBe('msg-oldest');
    expect(result.results[0].body).toBe('Hello');
  });

  it('should map socket incoming typing.changed event', () => {
    const result = mapChatSocketEventFromApi({
      type: 'typing.changed',
      user_id: 'user-1',
      is_typing: true,
    });
    expect(result).toEqual({
      type: 'typing.changed',
      userId: 'user-1',
      isTyping: true,
    });
  });

  it('should map conversation payload to API', () => {
    expect(mapConversationPayloadToApi({
      title: 'Direct',
      isGroup: false,
      participantIds: ['user-2'],
    })).toEqual({
      title: 'Direct',
      is_group: false,
      participant_ids: ['user-2'],
    });
  });

  it('should map push subscription payload to API', () => {
    expect(mapPushSubscriptionPayloadToApi({
      endpoint: 'https://push.example/1',
      keys: { p256dh: 'key1', auth: 'key2' },
      userAgent: 'Mozilla',
      platform: 'desktop',
    })).toEqual({
      endpoint: 'https://push.example/1',
      keys: { p256dh: 'key1', auth: 'key2' },
      user_agent: 'Mozilla',
      platform: 'desktop',
    });
  });

  it('should map inbox conversation.message_created event', () => {
    const result = mapInboxEventFromApi({
      type: 'conversation.message_created',
      conversation_id: 'conv-1',
      conversation_title: 'Team',
      is_group: true,
      is_muted: false,
      unread_count: 3,
      message: {
        id: 'msg-1',
        conversation: 'conv-1',
        sender: 'user-2',
        sender_name: 'Alice',
        body: 'Hola',
        message_type: 'text',
        metadata: {},
        client_message_id: '',
        created_at: '2024-01-01T10:00:00Z',
        is_deleted: false,
      },
    });
    expect(result?.type).toBe('conversation.message_created');
    expect(result?.conversationId).toBe('conv-1');
    expect(result?.unreadCount).toBe(3);
    expect(result?.message.body).toBe('Hola');
    expect(result?.message.senderId).toBe('user-2');
  });

  it('should map outgoing message.send to snake_case', () => {
    expect(mapChatSocketOutgoingToApi({
      type: 'message.send',
      body: 'Hello',
      messageType: 'text',
      metadata: {},
      clientMessageId: 'uuid-1',
    })).toEqual({
      type: 'message.send',
      body: 'Hello',
      message_type: 'text',
      metadata: {},
      client_message_id: 'uuid-1',
    });
  });

  it('should use conversation title from API', () => {
    const conversation = mapConversationFromApi({
      id: 'conv-1',
      title: 'Mi vecino',
      is_group: false,
      participants: [
        {
          id: 'p1',
          user: { id: 'user-1', display_name: 'Alice' },
          display_name: 'Alice',
          custom_display_name: null,
          last_read_at: null,
          is_muted: false,
          is_archived: false,
        },
        {
          id: 'p2',
          user: { id: 'user-2', display_name: 'Bob' },
          display_name: 'Mi vecino',
          custom_display_name: 'Mi vecino',
          last_read_at: null,
          is_muted: false,
          is_archived: false,
        },
      ],
      last_message: null,
      last_message_at: null,
      unread_count: 0,
    });
    expect(getConversationDisplayTitle(conversation, 'user-1')).toBe('Mi vecino');
    expect(conversation.participants[1].customDisplayName).toBe('Mi vecino');
    expect(conversation.participants[1].displayName).toBe('Mi vecino');
  });

  it('should use title for group conversations', () => {
    const conversation = mapConversationFromApi({
      id: 'conv-2',
      title: 'Team chat',
      is_group: true,
      participants: [
        { id: 'p1', user: { id: 'user-1', name: 'Alice' }, last_read_at: null, is_muted: false, is_archived: false },
        { id: 'p2', user: { id: 'user-2', name: 'Bob' }, last_read_at: null, is_muted: false, is_archived: false },
        { id: 'p3', user: { id: 'user-3', name: 'Carol' }, last_read_at: null, is_muted: false, is_archived: false },
      ],
      last_message: null,
      last_message_at: null,
      unread_count: 0,
    });
    expect(getConversationDisplayTitle(conversation, 'user-1')).toBe('Team chat');
  });

  it('should map peer display name from API', () => {
    expect(mapPeerDisplayNameFromApi({
      target_user_id: 'user-2',
      custom_display_name: 'Mi vecino',
      display_name: 'Mi vecino',
      default_display_name: 'Bob',
    })).toEqual({
      targetUserId: 'user-2',
      customDisplayName: 'Mi vecino',
      displayName: 'Mi vecino',
      defaultDisplayName: 'Bob',
    });
  });

  it('should apply peer display name to direct conversation', () => {
    const conversation = mapConversationFromApi({
      id: 'conv-1',
      title: 'Bob',
      is_group: false,
      participants: [
        {
          id: 'p1',
          user: { id: 'user-1', display_name: 'Alice' },
          display_name: 'Alice',
          last_read_at: null,
          is_muted: false,
          is_archived: false,
        },
        {
          id: 'p2',
          user: { id: 'user-2', display_name: 'Bob' },
          display_name: 'Bob',
          last_read_at: null,
          is_muted: false,
          is_archived: false,
        },
      ],
      last_message: null,
      last_message_at: null,
      unread_count: 0,
    });
    const response = mapPeerDisplayNameFromApi({
      target_user_id: 'user-2',
      custom_display_name: 'Mi vecino',
      display_name: 'Mi vecino',
      default_display_name: 'Bob',
    });
    const updated = applyPeerDisplayNameToConversation(conversation, 'user-2', response);
    expect(updated.title).toBe('Mi vecino');
    expect(updated.participants[1].displayName).toBe('Mi vecino');
    expect(updated.participants[1].customDisplayName).toBe('Mi vecino');
  });

  it('should prefer sender_name for message display', () => {
    const result = mapChatMessageFromApi({
      id: 'msg-5',
      conversation_id: 'conv-1',
      sender: { id: 'user-2', display_name: 'Bob' },
      sender_name: 'Mi vecino',
      body: 'Hola',
      message_type: 'text',
      metadata: {},
      client_message_id: 'client-5',
      is_deleted: false,
      created_at: '2024-01-05T10:00:00Z',
    });
    expect(result.senderName).toBe('Mi vecino');
  });
});
