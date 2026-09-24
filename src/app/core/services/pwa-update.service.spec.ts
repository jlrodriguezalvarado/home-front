import {
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { EMPTY } from 'rxjs';
import { I18nService } from '../i18n/i18n.service';
import { ToastService } from '../../shared/services/toast.service';
import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  const swUpdate = {
    isEnabled: true,
    versionUpdates: EMPTY,
    checkForUpdate: jasmine.createSpy('checkForUpdate'),
    activateUpdate: jasmine.createSpy('activateUpdate'),
  };

  beforeEach(() => {
    swUpdate.checkForUpdate.calls.reset();
    swUpdate.checkForUpdate.and.resolveTo(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: swUpdate },
        { provide: ToastService, useValue: { info: () => undefined, error: () => undefined } },
        { provide: I18nService, useValue: { t: (key: string) => key } },
      ],
    });
  });

  it('initializes background checks only once', fakeAsync(() => {
    const service = TestBed.inject(PwaUpdateService);
    service.online.set(true);
    const checkForUpdate = spyOn(
      service as unknown as { checkForUpdate(): Promise<void> },
      'checkForUpdate',
    ).and.resolveTo();

    service.init();
    service.init();
    tick(8000);

    expect(checkForUpdate).toHaveBeenCalledTimes(1);
    discardPeriodicTasks();
  }));

  it('does not check for updates while offline', async () => {
    const service = TestBed.inject(PwaUpdateService);
    service.online.set(false);

    await (service as unknown as { checkForUpdate(): Promise<void> }).checkForUpdate();

    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
  });
});
