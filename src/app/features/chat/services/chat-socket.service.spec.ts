import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ChatConversationWebSocketService } from './chat-conversation-websocket.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ChatSocketIncomingEvent } from '../models/chat.models';

describe('ChatConversationWebSocketService', () => {
  let service: ChatConversationWebSocketService;
  let events: ChatSocketIncomingEvent[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ChatConversationWebSocketService,
        { provide: AuthService, useValue: { getAccessToken: () => 'token' } },
      ],
    });
    service = TestBed.inject(ChatConversationWebSocketService);
    events = [];
    service.events$.subscribe((event) => events.push(event));
  });

  it('should emit message.created events', () => {
    (service as unknown as { handleMessage: (raw: string) => void }).handleMessage(JSON.stringify({
      type: 'message.created',
      id: 'msg-99',
      conversation_id: 'conv-1',
      sender: { id: 'user-1', name: 'Alice' },
      body: 'Hello',
      message_type: 'text',
      metadata: {},
      client_message_id: 'client-1',
      is_deleted: false,
      created_at: '2024-01-01T10:00:00Z',
    }));
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('message.created');
    if (events[0].type === 'message.created') {
      expect(events[0].message.id).toBe('msg-99');
    }
  });

  it('should emit message.send.failed events', () => {
    (service as unknown as { handleMessage: (raw: string) => void }).handleMessage(JSON.stringify({
      type: 'message.send.failed',
      client_message_id: 'client-1',
      message: 'Failed',
    }));
    expect(events.length).toBe(1);
    expect(events[0]).toEqual({
      type: 'message.send.failed',
      clientMessageId: 'client-1',
      message: 'Failed',
    });
  });
});
