import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { CommerceRepository } from './commerce.repository';
import { CommerceDetail, SourceUrlDetail } from './commerce.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../shared/services/toast.service';
import { normalizeAppError } from '../../core/api/app-error';
import { CommerceReprocessService } from '../../core/notifications/commerce-reprocess.service';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';

@Component({
  selector: 'app-commerce-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingStateComponent, ErrorStateComponent],
  templateUrl: './commerce-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './commerce-detail.component.scss',
})
export class CommerceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repo = inject(CommerceRepository);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);
  readonly reprocess = inject(CommerceReprocessService);
  commerce = signal<CommerceDetail | null>(null);
  loading = signal(false);
  error = signal(false);
  private pollSub: Subscription | null = null;
  private commerceId = '';

  ngOnInit() {
    this.commerceId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.commerceId) {
      this.error.set(true);
      return;
    }
    this.load();
    this.reprocess.finished$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.commerce_id === this.commerceId) this.load(true);
    });
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  load(silent = false) {
    if (!silent) {
      this.loading.set(true);
      this.error.set(false);
    }
    this.repo.getById(this.commerceId).subscribe({
      next: (detail) => {
        this.commerce.set(detail);
        this.loading.set(false);
        this.syncPolling(detail);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
        this.stopPolling();
      },
    });
  }

  back() {
    this.router.navigate(['/commerces']);
  }

  retryLoad() {
    this.load();
  }

  canRunBatch(): boolean {
    const c = this.commerce();
    return !!c && !c.urlsProcessing;
  }

  canReprocess(): boolean {
    const c = this.commerce();
    return !!c?.reprocessStrategy && !c.urlsProcessing && !c.wasReprocessedToday;
  }

  showReprocessWarning(): boolean {
    const c = this.commerce();
    return !!c?.reprocessStrategy && c.wasReprocessedToday;
  }

  isReprocessing(): boolean {
    return this.reprocess.reprocessingCommerceId() === this.commerceId;
  }

  canProcessSourceUrl(sourceUrl: SourceUrlDetail): boolean {
    const c = this.commerce();
    return !sourceUrl.isProcessing && !c?.urlsProcessing;
  }

  onRunScrapingBatch() {
    if (!this.canRunBatch()) return;
    this.repo.runScrapingBatch(this.commerceId).subscribe({
      next: () => {
        this.toast.info(this.i18n.t('batchProcessingStarted'));
        this.load(true);
      },
      error: (err: unknown) => this.handleScrapingError(err),
    });
  }

  onReprocessProductUrls() {
    if (!this.commerce()?.reprocessStrategy || this.commerce()?.urlsProcessing) return;
    this.reprocess.reprocess(this.commerceId);
    setTimeout(() => this.load(true), 500);
  }

  onProcessSourceUrl(sourceUrl: SourceUrlDetail) {
    if (!this.canProcessSourceUrl(sourceUrl)) return;
    this.repo.runSourceUrlScraping(this.commerceId, { source_url_id: sourceUrl.id }).subscribe({
      next: () => {
        this.toast.info(this.processingStartedMessage(sourceUrl.name));
        this.load(true);
      },
      error: (err: unknown) => this.handleScrapingError(err),
    });
  }

  jobStatusLabel(status: string): string {
    const labels: Record<string, { en: string; es: string }> = {
      pending: { en: 'Pending', es: 'Pendiente' },
      processing: { en: 'Processing', es: 'Procesando' },
      completed: { en: 'Completed', es: 'Completado' },
      completed_with_errors: { en: 'Completed with errors', es: 'Completado con errores' },
      failed: { en: 'Failed', es: 'Fallido' },
      cancelled: { en: 'Cancelled', es: 'Cancelado' },
    };
    const label = labels[status];
    if (!label) return status;
    return this.i18n.lang() === 'en' ? label.en : label.es;
  }

  private processingStartedMessage(categoryName: string): string {
    return this.i18n.lang() === 'en'
      ? `Processing started for ${categoryName}`
      : `Procesamiento iniciado para ${categoryName}`;
  }

  private handleScrapingError(error: unknown) {
    const err = normalizeAppError(error);
    if (err.status === 409) {
      this.toast.info(this.i18n.t('processingAlreadyRunning'));
      this.load(true);
      return;
    }
    if (err.status === 404) {
      this.toast.error(this.i18n.t('sourceUrlNotFound'));
      return;
    }
    this.toast.error(this.i18n.t('processingStartFailed'));
  }

  private syncPolling(detail: CommerceDetail) {
    const shouldPoll = detail.urlsProcessing || detail.sourceUrls.some((u) => u.isProcessing);
    if (shouldPoll && !this.pollSub) {
      this.pollSub = interval(5000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.load(true));
    } else if (!shouldPoll) {
      this.stopPolling();
    }
  }

  private stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }
}
