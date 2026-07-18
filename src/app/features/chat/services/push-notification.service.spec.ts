import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ChatRepository } from '../repositories/chat.repository';
import { PushNotificationService } from './push-notification.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let repo: jasmine.SpyObj<ChatRepository>;
  beforeEach(() => {
    repo = jasmine.createSpyObj<ChatRepository>('ChatRepository', [
      'getVapidPublicKey',
      'savePushSubscription',
      'unsubscribePushSubscription',
    ]);
    TestBed.configureTestingModule({
      providers: [
        PushNotificationService,
        { provide: ChatRepository, useValue: repo },
      ],
    });
    service = TestBed.inject(PushNotificationService);
    spyOn(service, 'isSupported').and.returnValue(true);
  });

  it('does not request notification permission automatically after login', async () => {
    spyOnProperty(Notification, 'permission', 'get').and.returnValue('default');
    const requestPermission = spyOn(Notification, 'requestPermission');
    await service.registerAfterLogin();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(repo.getVapidPublicKey).not.toHaveBeenCalled();
  });

  it('requests permission and saves a subscription from a user action', async () => {
    spyOnProperty(Notification, 'permission', 'get').and.returnValue('default');
    spyOn(Notification, 'requestPermission').and.resolveTo('granted');
    repo.getVapidPublicKey.and.returnValue(of('AQID'));
    repo.savePushSubscription.and.returnValue(of(void 0));
    const subscription = {
      endpoint: 'https://push.example/subscription',
      options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
      toJSON: () => ({ keys: { p256dh: 'p256dh-key', auth: 'auth-key' } }),
    } as unknown as PushSubscription;
    const registration = {
      pushManager: {
        getSubscription: () => Promise.resolve(subscription),
      },
    } as unknown as ServiceWorkerRegistration;
    spyOn(service as unknown as { getRegistration: () => Promise<ServiceWorkerRegistration> }, 'getRegistration')
      .and.resolveTo(registration);
    const result = await service.subscribe();
    expect(result).toBeTrue();
    expect(Notification.requestPermission).toHaveBeenCalled();
    expect(repo.savePushSubscription).toHaveBeenCalled();
  });
});
