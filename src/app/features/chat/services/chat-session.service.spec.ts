import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ChatInboxWebSocketService } from './chat-inbox-websocket.service';
import { ChatConversationWebSocketService } from './chat-conversation-websocket.service';
import { PushNotificationService } from './push-notification.service';
import { ChatNotificationService } from './chat-notification.service';
import { ChatService } from './chat.service';
import { ChatSessionService } from './chat-session.service';

describe('ChatSessionService', () => {
  const loggedOut = new Subject<void>();
  const inboxMessages = new Subject<never>();
  const inboxPresence = new Subject<never>();
  const inboxWebSocket = jasmine.createSpyObj<ChatInboxWebSocketService>(
    'ChatInboxWebSocketService',
    ['connect', 'disconnect'],
    { messages$: inboxMessages, presence$: inboxPresence }
  );
  const conversationWebSocket = jasmine.createSpyObj<ChatConversationWebSocketService>(
    'ChatConversationWebSocketService',
    ['markUserOnline', 'markUserOffline']
  );
  const push = jasmine.createSpyObj<PushNotificationService>('PushNotificationService', [
    'registerAfterLogin',
    'unsubscribeOnLogout'
  ]);
  const notifications = jasmine.createSpyObj<ChatNotificationService>(
    'ChatNotificationService',
    ['handleInboxEvent', 'setCurrentUserId', 'setActiveConversation', 'reset'],
    { activeConversationId: signal<string | null>(null) }
  );
  const chat = jasmine.createSpyObj<ChatService>('ChatService', [
    'applyInboxMessage',
    'reset'
  ]);

  beforeEach(() => {
    inboxWebSocket.disconnect.calls.reset();
    push.unsubscribeOnLogout.calls.reset();
    notifications.reset.calls.reset();
    chat.reset.calls.reset();
    push.unsubscribeOnLogout.and.returnValue(Promise.resolve());
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            loggedOut$: loggedOut.asObservable(),
            isAuthenticated: () => false
          }
        },
        { provide: ChatInboxWebSocketService, useValue: inboxWebSocket },
        { provide: ChatConversationWebSocketService, useValue: conversationWebSocket },
        { provide: PushNotificationService, useValue: push },
        { provide: ChatNotificationService, useValue: notifications },
        { provide: ChatService, useValue: chat }
      ]
    });
  });

  it('disconnects sockets and clears chat state on any auth logout', () => {
    TestBed.inject(ChatSessionService);

    loggedOut.next();

    expect(inboxWebSocket.disconnect).toHaveBeenCalled();
    expect(chat.reset).toHaveBeenCalled();
    expect(notifications.reset).toHaveBeenCalled();
    expect(push.unsubscribeOnLogout).toHaveBeenCalledOnceWith(false);
  });
});
