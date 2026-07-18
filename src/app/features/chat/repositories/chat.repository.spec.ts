import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChatRepository } from './chat.repository';
import { apiUrl } from '../../../core/api/api-url';
import { API_ENDPOINTS } from '../../../core/api/endpoints';

describe('ChatRepository', () => {
  let repo: ChatRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ChatRepository],
    });
    repo = TestBed.inject(ChatRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list conversations from paginated response', () => {
    let result: unknown;
    repo.listConversations().subscribe((res) => (result = res));
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.chat.conversations.list));
    req.flush({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 'conv-1',
        title: 'Chat',
        is_group: false,
        participants: [],
        last_message: null,
        last_message_at: null,
        unread_count: 0,
      }],
    });
    expect((result as { title: string }[])[0].title).toBe('Chat');
  });

  it('should list messages page from paginated response', () => {
    let result: unknown;
    repo.listMessagesPage('conv-1', { perPage: 20 }).subscribe((res) => (result = res));
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.chat.conversations.messages('conv-1')));
    expect(req.request.params.get('perPage')).toBe('20');
    req.flush({
      has_more: true,
      next_before: 'msg-0',
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
    const page = result as { hasMore: boolean; nextBefore: string; results: { body: string }[] };
    expect(page.hasMore).toBe(true);
    expect(page.nextBefore).toBe('msg-0');
    expect(page.results[0].body).toBe('Hello');
  });

  it('should send message via REST', () => {
    let result: unknown;
    repo.sendMessage('conv-1', {
      body: 'Hello',
      messageType: 'text',
      metadata: {},
      clientMessageId: 'client-1',
    }).subscribe((res) => (result = res));
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.chat.conversations.messages('conv-1')));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      body: 'Hello',
      message_type: 'text',
      metadata: {},
      client_message_id: 'client-1',
    });
    req.flush({
      id: 'msg-1',
      conversation_id: 'conv-1',
      sender_id: 'user-1',
      body: 'Hello',
      message_type: 'text',
      metadata: {},
      client_message_id: 'client-1',
      is_deleted: false,
      created_at: '2024-01-01T10:00:00Z',
    });
    expect((result as { body: string }).body).toBe('Hello');
  });

  it('should save push subscription with snake_case payload', () => {
    repo.savePushSubscription({
      endpoint: 'https://push.example/1',
      keys: { p256dh: 'a', auth: 'b' },
      userAgent: 'Mozilla',
      platform: 'ios',
    }).subscribe();
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.chat.pushSubscriptions.create));
    expect(req.request.body).toEqual({
      endpoint: 'https://push.example/1',
      keys: { p256dh: 'a', auth: 'b' },
      user_agent: 'Mozilla',
      platform: 'ios',
    });
    req.flush(null);
  });

  it('should get vapid public key from object response', () => {
    let result = '';
    repo.getVapidPublicKey().subscribe((key) => (result = key));
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.chat.pushSubscriptions.vapidPublicKey));
    req.flush({ public_key: 'vapid-key' });
    expect(result).toBe('vapid-key');
  });

  it('should list users from paginated response', () => {
    let result: unknown;
    repo.listUsers({ search: 'alice' }).subscribe((res) => (result = res));
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.chat.users.list));
    expect(req.request.params.get('search')).toBe('alice');
    req.flush({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 'user-1',
        name: 'Alice',
        email: 'alice@test.com',
      }],
    });
    expect((result as { name: string }[])[0].name).toBe('Alice');
  });
});
