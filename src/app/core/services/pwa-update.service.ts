import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const RELOAD_DELAY_MS = 5000;
const INITIAL_CHECK_DELAY_MS = 35_000;

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly toast = inject(ToastService);
  private reloadScheduled = false;

  init(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    interval(CHECK_INTERVAL_MS).subscribe(() => {
      void this.swUpdate.checkForUpdate();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.swUpdate.checkForUpdate();
      }
    });

    setTimeout(() => {
      void this.swUpdate.checkForUpdate();
    }, INITIAL_CHECK_DELAY_MS);

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.scheduleReload());
  }

  private scheduleReload(): void {
    if (this.reloadScheduled) {
      return;
    }
    this.reloadScheduled = true;

    this.toast.show('Nueva versión disponible. Actualizando...', 'info', RELOAD_DELAY_MS);

    setTimeout(() => {
      void this.swUpdate.activateUpdate().then(() => location.reload());
    }, RELOAD_DELAY_MS);
  }
}
