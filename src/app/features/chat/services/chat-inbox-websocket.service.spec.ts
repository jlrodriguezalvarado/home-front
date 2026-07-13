import { TestBed } from '@angular/core/testing';
import { ChatInboxWebSocketService } from './chat-inbox-websocket.service';
import { AuthService } from '../../../core/auth/auth.service';
import { InboxMessageEvent, InboxPresenceEvent } from '../models/chat.models';

describe('ChatInboxWebSocketService', () => {
  let service: ChatInboxWebSocketService;
  let events: InboxMessageEvent[];
  let presenceEvents: InboxPresenceEvent[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ChatInboxWebSocketService,
        { provide: AuthService, useValue: { getAccessToken: () => 'token', refreshToken: () => ({ subscribe: () => undefined }) } },
      ],
    });
    service = TestBed.inject(ChatInboxWebSocketService);
    events = [];
    presenceEvents = [];
    service.messages$.subscribe((event) => events.push(event));
    service.presence$.subscribe((event) => presenceEvents.push(event));
  });

  it('should emit conversation.message_created events', () => {
    (service as unknown as { handleMessage: (raw: string) => void }).handleMessage(JSON.stringify({
      type: 'conversation.message_created',
      conversation_id: 'conv-1',
      conversation_title: 'Alice',
      is_group: false,
      is_muted: false,
      unread_count: 1,
      message: {
        id: 'msg-1',
        conversation: 'conv-1',
        sender: 'user-2',
        sender_name: 'Alice',
        body: 'Hi',
        message_type: 'text',
        metadata: {},
        client_message_id: '',
        created_at: '2024-01-01T10:00:00Z',
        is_deleted: false,
      },
    }));
    expect(events.length).toBe(1);
    expect(events[0].conversationId).toBe('conv-1');
    expect(events[0].message.body).toBe('Hi');
  });

  it('should emit inbox presence events', () => {
    (service as unknown as { handleMessage: (raw: string) => void }).handleMessage(JSON.stringify({
      type: 'user.joined',
      conversation_id: 'conv-1',
      user_id: 'user-2',
    }));
    expect(presenceEvents.length).toBe(1);
    expect(presenceEvents[0]).toEqual({
      conversationId: 'conv-1',
      userId: 'user-2',
      isOnline: true,
    });
  });
});
