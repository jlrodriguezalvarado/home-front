import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { CommerceRepository } from './commerce.repository';
import { CommerceListItem } from './commerce.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { CommerceReprocessService } from '../../core/notifications/commerce-reprocess.service';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';

@Component({
  selector: 'app-commerce-list',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './commerce-list.component.html',
  styleUrl: './commerce-list.component.scss',
})
export class CommerceListComponent implements OnInit {
  private readonly repo = inject(CommerceRepository);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);
  readonly reprocess = inject(CommerceReprocessService);
  commerces = signal<CommerceListItem[]>([]);
  loading = signal(false);
  error = signal(false);
  private pollSub: Subscription | null = null;

  ngOnInit() {
    this.load();
    this.reprocess.finished$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load(true));
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  load(silent = false) {
    if (!silent) {
      this.loading.set(true);
      this.error.set(false);
    }
    this.repo.getList().subscribe({
      next: (res) => {
        this.commerces.set(res);
        this.loading.set(false);
        this.syncPolling(res);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
        this.stopPolling();
      },
    });
  }

  viewDetail(commerceId: string) {
    this.router.navigate(['/commerces', commerceId]);
  }

  onReprocessProductUrls(event: Event, commerceId: string): void {
    event.stopPropagation();
    if (this.isActionDisabled(commerceId)) return;
    this.reprocess.reprocess(commerceId);
    setTimeout(() => this.load(true), 500);
  }

  isReprocessing(commerceId: string): boolean {
    return this.reprocess.reprocessingCommerceId() === commerceId;
  }

  isActionDisabled(commerceId: string): boolean {
    const commerce = this.commerces().find((c) => c.id === commerceId);
    return !!commerce?.urlsProcessing || this.isReprocessing(commerceId);
  }

  private syncPolling(commerces: CommerceListItem[]) {
    const shouldPoll = commerces.some((c) => c.urlsProcessing);
    if (shouldPoll && !this.pollSub) {
      this.pollSub = interval(7000)
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
