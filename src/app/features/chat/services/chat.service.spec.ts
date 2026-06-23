import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ChatService } from './chat.service';
import { ChatRepository } from '../repositories/chat.repository';
import { ChatConversationWebSocketService } from './chat-conversation-websocket.service';
import { ChatConversationStore } from './chat-conversation.store';
import { ChatNotificationService } from './chat-notification.service';
import { ChatInboxStore } from './chat-inbox.store';
import { AuthService } from '../../../core/auth/auth.service';
import { Subject } from 'rxjs';
import { ChatSocketIncomingEvent } from '../models/chat.models';
import { Router } from '@angular/router';
import { ToastService } from '../../../shared/services/toast.service';
import { I18nService } from '../../../core/i18n/i18n.service';

describe('ChatService', () => {
  let service: ChatService;
  let repo: jasmine.SpyObj<ChatRepository>;
  let socket: jasmine.SpyObj<ChatConversationWebSocketService>;
  let store: ChatConversationStore;
  let events$: Subject<ChatSocketIncomingEvent>;

  beforeEach(() => {
    events$ = new Subject<ChatSocketIncomingEvent>();
    store = new ChatConversationStore();
    repo = jasmine.createSpyObj('ChatRepository', ['listMessagesPage', 'sendMessage', 'markAsRead']);
    socket = jasmine.createSpyObj('ChatConversationWebSocketService', ['connect', 'disconnect', 'sendMessage', 'markAsRead'], {
      events$: events$.asObservable(),
      connected: () => true,
    });
    repo.listMessagesPage.and.returnValue(of({
      hasMore: false,
      nextBefore: null,
      results: [{
        id: 'msg-1',
        conversationId: 'conv-1',
        sender: { id: 'user-2', name: 'Bob' },
        senderId: 'user-2',
        body: 'Hi',
        messageType: 'text',
        metadata: {},
        clientMessageId: 'client-1',
        isDeleted: false,
        createdAt: '2024-01-01T10:00:00Z',
      }],
    }));
    repo.markAsRead.and.returnValue(of(void 0));
    socket.sendMessage.and.returnValue(true);
    TestBed.configureTestingModule({
      providers: [
        ChatService,
        { provide: ChatRepository, useValue: repo },
        { provide: ChatConversationWebSocketService, useValue: socket },
        { provide: ChatConversationStore, useValue: store },
        { provide: AuthService, useValue: { getCurrentUser: () => of({ id: 'user-1', email: 'a@test.com' }) } },
        ChatNotificationService,
        ChatInboxStore,
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']) },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['show']) },
        { provide: I18nService, useValue: { t: (key: string) => key } },
      ],
    });
    service = TestBed.inject(ChatService);
  });

  it('should load initial messages oldest-first', () => {
    service.openConversation('conv-1');
    expect(store.messages().length).toBe(1);
    expect(store.messages()[0].body).toBe('Hi');
    expect(store.messages()[0].isOwn).toBe(false);
  });

  it('should add optimistic message on send', () => {
    service.openConversation('conv-1');
    const clientId = service.sendMessage('Hello');
    expect(clientId).toBeTruthy();
    const own = store.messages().find((message) => message.isOwn);
    expect(own?.body).toBe('Hello');
    expect(own?.status).toBe('pending');
    expect(socket.sendMessage).toHaveBeenCalled();
  });

  it('should mark optimistic message as sent on message.created', () => {
    service.openConversation('conv-1');
    const clientId = service.sendMessage('Hello')!;
    events$.next({
      type: 'message.created',
      message: {
        id: 'msg-99',
        conversationId: 'conv-1',
        sender: { id: 'user-1', name: 'Alice' },
        senderId: 'user-1',
        body: 'Hello',
        messageType: 'text',
        metadata: {},
        clientMessageId: clientId,
        isDeleted: false,
        createdAt: '2024-01-02T10:00:00Z',
      },
    });
    const own = store.messages().find((message) => message.clientMessageId === clientId);
    expect(own?.status).toBe('sent');
    expect(own?.id).toBe('msg-99');
  });

  it('should mark message as failed on message.send.failed', () => {
    service.openConversation('conv-1');
    const clientId = service.sendMessage('Hello')!;
    events$.next({
      type: 'message.send.failed',
      clientMessageId: clientId,
      message: 'Failed',
    });
    const own = store.messages().find((message) => message.clientMessageId === clientId);
    expect(own?.status).toBe('failed');
  });

  it('should fallback to REST when websocket send fails', () => {
    socket.sendMessage.and.returnValue(false);
    repo.sendMessage.and.returnValue(of({
      id: 'msg-rest',
      conversationId: 'conv-1',
      sender: { id: 'user-1', name: 'Alice' },
      senderId: 'user-1',
      body: 'Hello',
      messageType: 'text',
      metadata: {},
      clientMessageId: 'client-rest',
      isDeleted: false,
      createdAt: '2024-01-02T10:00:00Z',
    }));
    service.openConversation('conv-1');
    service.sendMessage('Hello');
    expect(repo.sendMessage).toHaveBeenCalled();
  });

  it('should mark message failed when REST fallback errors', () => {
    socket.sendMessage.and.returnValue(false);
    repo.sendMessage.and.returnValue(throwError(() => new Error('fail')));
    service.openConversation('conv-1');
    const clientId = service.sendMessage('Hello')!;
    const own = store.messages().find((message) => message.clientMessageId === clientId);
    expect(own?.status).toBe('failed');
  });
});
