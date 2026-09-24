import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { NotificationsSessionService } from './core/notifications/notifications-session.service';
import { ChatNotificationService } from './features/chat/services/chat-notification.service';
import { ChatSessionService } from './features/chat/services/chat-session.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        {
          provide: PwaUpdateService,
          useValue: jasmine.createSpyObj<PwaUpdateService>('PwaUpdateService', ['init'])
        },
        {
          provide: ChatSessionService,
          useValue: jasmine.createSpyObj<ChatSessionService>('ChatSessionService', ['start'])
        },
        {
          provide: NotificationsSessionService,
          useValue: jasmine.createSpyObj<NotificationsSessionService>(
            'NotificationsSessionService',
            ['start']
          )
        },
        {
          provide: ChatNotificationService,
          useValue: jasmine.createSpyObj<ChatNotificationService>('ChatNotificationService', [
            'handleNotificationClick'
          ])
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'home-manager' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('home-manager');
  });
});
