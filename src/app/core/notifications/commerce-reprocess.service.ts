import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject } from 'rxjs';
import { CommerceRepository } from '../../features/commerce/commerce.repository';
import { I18nService } from '../i18n/i18n.service';
import { ToastService } from '../../shared/services/toast.service';
import { NotificationsWebSocketService } from './notifications-websocket.service';
import { CommerceReprocessFinishedEvent, CommerceReprocessResponse } from './notifications.models';

@Injectable({ providedIn: 'root' })
export class CommerceReprocessService {
  private readonly commerceRepo = inject(CommerceRepository);
  private readonly notificationsWs = inject(NotificationsWebSocketService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  private readonly finishedSubject = new Subject<CommerceReprocessFinishedEvent>();
  readonly reprocessingCommerceId = signal<string | null>(null);
  readonly finished$: Observable<CommerceReprocessFinishedEvent> = this.finishedSubject.asObservable();

  constructor() {
    this.notificationsWs.commerceReprocessFinished$
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.onCommerceReprocessFinished(event));
  }

  reprocess(commerceId: string): void {
    if (!commerceId || this.reprocessingCommerceId()) return;
    this.commerceRepo.reprocessProductUrls(commerceId).subscribe({
      next: (response) => this.handleReprocessResponse(response),
      error: () => {
        this.toast.error(this.i18n.t('reprocessStartFailed'));
      },
    });
  }

  private handleReprocessResponse(response: CommerceReprocessResponse): void {
    if (response.status === 'already_processed_today') {
      this.toast.info(response.message || this.i18n.t('reprocessAlreadyToday'));
      return;
    }
    if (response.status === 'not_supported') {
      this.toast.info(response.message || this.i18n.t('reprocessNotSupported'));
      return;
    }
    this.reprocessingCommerceId.set(response.commerce_id);
    this.toast.info(this.i18n.t('reprocessStarted'));
  }

  private onCommerceReprocessFinished(event: CommerceReprocessFinishedEvent): void {
    if (this.reprocessingCommerceId() === event.commerce_id) {
      this.reprocessingCommerceId.set(null);
    }
    const variant =
      event.status === 'completed'
        ? 'success'
        : event.status === 'completed_with_errors'
          ? 'info'
          : 'error';
    this.toast.show(this.finishedMessage(event), variant, 5000);
    this.finishedSubject.next(event);
  }

  private finishedMessage(event: CommerceReprocessFinishedEvent): string {
    const name = event.commerce_name;
    if (event.status === 'completed') {
      return this.i18n.lang() === 'en'
        ? `${name}: reprocessing completed`
        : `${name}: reprocesamiento completado`;
    }
    if (event.status === 'completed_with_errors') {
      return this.i18n.lang() === 'en'
        ? `${name}: completed with errors`
        : `${name}: completado con errores`;
    }
    return this.i18n.lang() === 'en'
      ? `${name}: reprocessing failed`
      : `${name}: reprocesamiento fallido`;
  }
}
