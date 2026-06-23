import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConversationRoomComponent } from './conversation-room.component';
import { ChatRepository } from '../repositories/chat.repository';
import { ChatConversationWebSocketService } from '../services/chat-conversation-websocket.service';
import { ChatService } from '../services/chat.service';
import { ChatConversationStore } from '../services/chat-conversation.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

describe('ConversationRoomComponent', () => {
  let component: ConversationRoomComponent;
  let chat: jasmine.SpyObj<ChatService>;
  let store: ChatConversationStore;
  let socket: jasmine.SpyObj<ChatConversationWebSocketService>;
  let repo: jasmine.SpyObj<ChatRepository>;

  beforeEach(async () => {
    store = new ChatConversationStore();
    chat = jasmine.createSpyObj('ChatService', [
      'openConversation',
      'closeConversation',
      'sendMessage',
      'retryMessage',
      'markAsRead',
      'loadOlderMessages',
    ], {
      store,
      currentUserId: () => 'user-1',
    });
    chat.sendMessage.and.returnValue('client-1');
    socket = jasmine.createSpyObj('ChatConversationWebSocketService', [
      'sendTypingStart',
      'sendTypingStop',
    ], {
      connected: () => true,
      connecting: () => false,
      typingUsers: () => ({}),
    });
    repo = jasmine.createSpyObj('ChatRepository', ['getConversation']);
    repo.getConversation.and.returnValue(of({
      id: 'conv-1',
      title: 'Test',
      isGroup: false,
      participants: [],
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: 0,
    }));
    await TestBed.configureTestingModule({
      imports: [ConversationRoomComponent],
      providers: [
        { provide: ChatService, useValue: chat },
        { provide: ChatConversationWebSocketService, useValue: socket },
        { provide: ChatRepository, useValue: repo },
        { provide: I18nService, useValue: { t: (k: string) => k, lang: () => 'en' } },
        { provide: ToastService, useValue: { error: jasmine.createSpy('error') } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'conv-1' }) } },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConversationRoomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should not send empty messages', () => {
    component.messageDraft.set('   ');
    component.sendMessage();
    expect(chat.sendMessage).not.toHaveBeenCalled();
  });

  it('should send trimmed message without clearing draft immediately', () => {
    component.messageDraft.set('  Hello  ');
    component.sendMessage();
    expect(chat.sendMessage).toHaveBeenCalledWith('Hello');
    expect(component.messageDraft()).toBe('  Hello  ');
  });
});
