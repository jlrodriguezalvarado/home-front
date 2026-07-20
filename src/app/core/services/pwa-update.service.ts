import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval } from 'rxjs';
import { I18nService } from '../i18n/i18n.service';
import { ToastService } from '../../shared/services/toast.service';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const RELOAD_DELAY_MS = 5000;
const INITIAL_CHECK_DELAY_MS = 8000;

@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private reloadScheduled = false;
  private refreshInProgress = false;
  private initialized = false;
  readonly online = signal(typeof navigator === 'undefined' || navigator.onLine);
  readonly updateAvailable = signal(false);
  readonly lastCheckedAt = signal<Date | null>(null);

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    window.addEventListener('online', () => {
      this.online.set(true);
      void this.checkForUpdate();
    });
    window.addEventListener('offline', () => this.online.set(false));
    if (!this.swUpdate.isEnabled) {
      return;
    }
    interval(CHECK_INTERVAL_MS).subscribe(() => {
      void this.checkForUpdate();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void this.checkForUpdate();
      }
    });
    setTimeout(() => {
      void this.checkForUpdate();
    }, INITIAL_CHECK_DELAY_MS);
    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateAvailable.set(true);
        this.scheduleReload();
      });
  }

  async refreshApp(): Promise<void> {
    if (this.refreshInProgress) {
      return;
    }
    this.refreshInProgress = true;
    try {
      if (this.swUpdate.isEnabled) {
        await this.forceServiceWorkerCheck();
        const hasUpdate = await this.swUpdate.checkForUpdate();
        if (hasUpdate) {
          this.toast.info(this.i18n.t('updatingApp'));
          await this.swUpdate.activateUpdate();
          location.reload();
          return;
        }
      }
      location.reload();
    } catch {
      this.toast.error(this.i18n.t('refreshFailed'));
      this.refreshInProgress = false;
    }
  }

  private async checkForUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled || !this.online()) {
      return;
    }
    try {
      await this.forceServiceWorkerCheck();
      await this.swUpdate.checkForUpdate();
      this.lastCheckedAt.set(new Date());
    } catch {
      // Ignore transient network errors during background checks
    }
  }

  private async forceServiceWorkerCheck(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    const registration = await navigator.serviceWorker.getRegistration('/');
    await registration?.update();
  }

  private scheduleReload(): void {
    if (this.reloadScheduled) {
      return;
    }
    this.reloadScheduled = true;
    this.toast.show(this.i18n.t('updatingApp'), 'info', RELOAD_DELAY_MS);
    setTimeout(() => {
      void this.swUpdate.activateUpdate().then(() => location.reload());
    }, RELOAD_DELAY_MS);
  }
}
