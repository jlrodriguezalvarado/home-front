import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FinanceRepository, FinanceReport } from './finance.repository';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-finance-reports-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './reports-history.component.html',
})
export class FinanceReportsHistoryComponent implements OnInit {
  repo = inject(FinanceRepository);
  i18n = inject(I18nService);

  reports = signal<FinanceReport[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.repo.listReports().subscribe({
      next: (res) => {
        this.reports.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.reports.set([]);
        this.loading.set(false);
      },
    });
  }
}
