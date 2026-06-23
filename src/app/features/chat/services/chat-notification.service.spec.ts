import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ChatNotificationService } from './chat-notification.service';
import { ChatInboxStore } from './chat-inbox.store';
import { ToastService } from '../../../shared/services/toast.service';
import { I18nService } from '../../../core/i18n/i18n.service';

describe('ChatNotificationService', () => {
  let service: ChatNotificationService;
  let router: jasmine.SpyObj<Router>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigateByUrl', 'navigate']);
    toast = jasmine.createSpyObj('ToastService', ['show']);
    TestBed.configureTestingModule({
      providers: [
        ChatNotificationService,
        ChatInboxStore,
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
        { provide: I18nService, useValue: { t: (key: string) => key } },
      ],
    });
    service = TestBed.inject(ChatNotificationService);
    service.setCurrentUserId('user-1');
  });

  it('should navigate by url from notification data', () => {
    service.handleNotificationClick({ url: '/chat/conversations/conv-1' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/chat/conversations/conv-1');
  });

  it('should navigate to conversation when conversationId is provided', () => {
    service.handleNotificationClick({ conversationId: 'conv-2' });
    expect(router.navigate).toHaveBeenCalledWith(['/chat/conversations', 'conv-2']);
  });

  it('should not toast for own messages', () => {
    service.handleInboxEvent({
      type: 'conversation.message_created',
      conversationId: 'conv-1',
      conversationTitle: 'Alice',
      isGroup: false,
      isMuted: false,
      unreadCount: 1,
      message: {
        id: 'msg-1',
        conversationId: 'conv-1',
        sender: { id: 'user-1', name: 'Me' },
        senderId: 'user-1',
        body: 'Hi',
        messageType: 'text',
        metadata: {},
        clientMessageId: '',
        isDeleted: false,
        createdAt: '2024-01-01T10:00:00Z',
      },
    });
    expect(toast.show).not.toHaveBeenCalled();
  });

  it('should not toast for muted conversations', () => {
    service.handleInboxEvent({
      type: 'conversation.message_created',
      conversationId: 'conv-1',
      conversationTitle: 'Alice',
      isGroup: false,
      isMuted: true,
      unreadCount: 1,
      message: {
        id: 'msg-1',
        conversationId: 'conv-1',
        sender: { id: 'user-2', name: 'Alice' },
        senderId: 'user-2',
        body: 'Hi',
        messageType: 'text',
        metadata: {},
        clientMessageId: '',
        isDeleted: false,
        createdAt: '2024-01-01T10:00:00Z',
      },
    });
    expect(toast.show).not.toHaveBeenCalled();
  });

  it('should toast for messages in other conversations', () => {
    service.setActiveConversation('conv-active');
    service.handleInboxEvent({
      type: 'conversation.message_created',
      conversationId: 'conv-1',
      conversationTitle: 'Bob',
      isGroup: false,
      isMuted: false,
      unreadCount: 2,
      message: {
        id: 'msg-1',
        conversationId: 'conv-1',
        sender: { id: 'user-2', name: 'Bob' },
        senderId: 'user-2',
        body: 'Hello',
        messageType: 'text',
        metadata: {},
        clientMessageId: '',
        isDeleted: false,
        createdAt: '2024-01-01T10:00:00Z',
      },
    });
    expect(toast.show).toHaveBeenCalled();
  });
});
