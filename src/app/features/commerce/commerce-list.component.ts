import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommerceRepository } from './commerce.repository';
import { Commerce } from '../../core/api/models';
import { I18nService } from '../../core/i18n/i18n.service';
import { CommerceReprocessService } from '../../core/notifications/commerce-reprocess.service';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';

@Component({
  selector: 'app-commerce-list',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './commerce-list.component.html',
  styleUrl: './commerce-list.component.scss',
})
export class CommerceListComponent implements OnInit {
  repo = inject(CommerceRepository);
  i18n = inject(I18nService);
  reprocess = inject(CommerceReprocessService);
  commerces = signal<Commerce[]>([]);
  loading = signal(false);
  error = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.repo.list().subscribe({
      next: (res) => {
        this.commerces.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  onReprocessProductUrls(commerceId: string): void {
    this.reprocess.reprocess(commerceId);
  }

  isReprocessing(commerceId: string): boolean {
    return this.reprocess.reprocessingCommerceId() === commerceId;
  }
}
