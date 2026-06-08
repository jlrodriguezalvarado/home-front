import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  FinanceRepository,
  FinanceReport,
  isReportFailed,
  isReportPending,
  isReportReady,
} from './finance.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-finance-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class FinanceReportsComponent implements OnInit {
  repo = inject(FinanceRepository);
  route = inject(ActivatedRoute);
  i18n = inject(I18nService);
  toast = inject(ToastService);

  year = '';
  month = '';
  busy = signal(false);
  lastReport = signal<FinanceReport | null>(null);

  ngOnInit() {
    const paramRoute = this.findYearMonthRoute();
    if (!paramRoute) return;
    paramRoute.paramMap.subscribe((params) => {
      this.year = params.get('year') ?? '';
      this.month = params.get('month') ?? '';
    });
  }

  private findYearMonthRoute(): ActivatedRoute | null {
    let route: ActivatedRoute | null = this.route;
    while (route) {
      if (route.snapshot.paramMap.has('year') && route.snapshot.paramMap.has('month')) {
        return route;
      }
      route = route.parent;
    }
    return null;
  }

  generate() {
    const yearNum = Number(this.year);
    const monthNum = Number(this.month);
    if (!Number.isFinite(yearNum)) return;

    this.busy.set(true);
    this.repo.generateReport(yearNum, monthNum).subscribe({
      next: (report) => {
        if (isReportPending(report)) {
          this.repo.waitForReportCompletion(report).subscribe({
            next: (final) => this.handleReportResult(final),
            error: () => {
              this.busy.set(false);
              this.toast.error(this.i18n.lang() === 'en' ? 'Report polling failed' : 'Error al consultar reporte');
            },
          });
        } else {
          this.handleReportResult(report);
        }
      },
      error: () => {
        this.busy.set(false);
        this.toast.error(this.i18n.lang() === 'en' ? 'Error generating report' : 'Error al generar reporte');
      },
    });
  }

  private handleReportResult(report: FinanceReport) {
    this.busy.set(false);
    this.lastReport.set(report);

    if (isReportFailed(report)) {
      this.toast.error(report.errorMessage ?? report.message ?? 'Report failed');
      return;
    }

    this.toast.success(this.i18n.lang() === 'en' ? 'Report ready' : 'Reporte listo');

    if (isReportReady(report) && report.fileUrl) {
      window.open(report.fileUrl, '_blank');
    }
  }
}
