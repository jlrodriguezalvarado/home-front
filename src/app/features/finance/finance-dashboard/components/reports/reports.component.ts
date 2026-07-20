import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, catchError, finalize, of, switchMap, timer } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { bindFinancePeriodLoads } from '../../../finance-period-route.util';
import { GeneratedReport } from '../../../models/finance.models';
import {
  FinanceReportsService,
  isReportFailed,
  isReportPending,
  isReportReady,
} from '../../../services/finance-reports.service';
import { financeApiErrorMessage } from '../../../services/finance-api.utils';
import { ConfirmService } from '../../../../../shared/services/confirm.service';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { ToastService } from '../../../../../shared/services/toast.service';

const POLL_INTERVAL_MS = 3000;
const PER_PAGE = 20;

@Component({
  selector: 'app-finance-reports',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class FinanceReportsComponent implements OnInit {
  reportsService = inject(FinanceReportsService);
  route = inject(ActivatedRoute);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  confirm = inject(ConfirmService);
  private destroyRef = inject(DestroyRef);

  year = '';
  month = '';
  busy = signal(false);
  loading = signal(true);
  reports = signal<GeneratedReport[]>([]);
  private pollSubs = new Map<string, Subscription>();
  private financialYearId = '';

  readonly monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  ngOnInit() {
    bindFinancePeriodLoads(
      this.route,
      this.destroyRef,
      (period) => this.loadReportsForPeriod(period.year),
      (res) => {
        this.reports.set(res.results);
        this.loading.set(false);
        res.results.forEach((report) => this.ensurePolling(report));
      },
      (period) => {
        this.year = period.year;
        this.month = period.month;
        this.stopAllPolling();
        this.loading.set(true);
      },
    );
    this.destroyRef.onDestroy(() => this.stopAllPolling());
  }

  generate() {
    const yearNum = Number(this.year);
    const monthNum = Number(this.month);
    if (!Number.isFinite(yearNum)) return;

    this.busy.set(true);
    this.reportsService
      .generateAndWait(yearNum, Number.isFinite(monthNum) ? monthNum : undefined, POLL_INTERVAL_MS)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (report) => this.handleReportResult(report),
        error: (err) => {
          this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
          this.reloadReports();
        },
      });
  }

  async deleteReport(report: GeneratedReport) {
    const lang = this.i18n.lang();
    const confirmed = await this.confirm.confirm(
      lang === 'en'
        ? `Delete report for year ${report.year}?`
        : `¿Eliminar el reporte del año ${report.year}?`,
      { variant: 'danger', confirmLabel: lang === 'en' ? 'Delete' : 'Eliminar' },
    );
    if (!confirmed) return;
    this.stopPolling(report.id);
    this.reportsService.delete(report.id).subscribe({
      next: () => {
        this.reports.update((list) => list.filter((r) => r.id !== report.id));
        this.toast.success(lang === 'en' ? 'Report deleted' : 'Reporte eliminado');
      },
      error: (err) => {
        this.toast.error(financeApiErrorMessage(err, lang));
        this.reloadReports();
      },
    });
  }

  downloadReport(report: GeneratedReport) {
    this.reportsService.getById(report.id).subscribe({
      next: (fresh) => {
        this.updateReportInList(fresh);
        if (isReportReady(fresh) && fresh.fileUrl) {
          window.open(fresh.fileUrl, '_blank', 'noopener');
          return;
        }
        this.toast.error(
          this.i18n.lang() === 'en'
            ? 'Report is not ready for download'
            : 'El reporte no está listo para descargar',
        );
      },
      error: (err) => this.toast.error(financeApiErrorMessage(err, this.i18n.lang())),
    });
  }

  statusLabel(status: string): string {
    const lang = this.i18n.lang();
    const map: Record<string, { en: string; es: string }> = {
      pending: { en: 'Pending', es: 'Pendiente' },
      processing: { en: 'Processing', es: 'Procesando' },
      completed: { en: 'Completed', es: 'Completado' },
      failed: { en: 'Failed', es: 'Fallido' },
    };
    const entry = map[status.toLowerCase()];
    return entry ? (lang === 'en' ? entry.en : entry.es) : status;
  }

  statusClass(status: string): string {
    const s = status.toLowerCase();
    if (s === 'completed') return 'bg-secondary-container text-on-secondary-container';
    if (s === 'failed') return 'bg-error-container text-on-error-container';
    if (s === 'processing') return 'bg-primary-container text-on-primary-container';
    return 'bg-surface-container text-on-surface-variant';
  }

  formatTriggerMonth(month: number | null): string {
    if (month == null) return '—';
    const lang = this.i18n.lang();
    if (lang === 'en') return this.monthNames[month - 1] ?? String(month);
    const esMonths = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    return esMonths[month - 1] ?? String(month);
  }

  formatIncludedMonths(months: number[]): string {
    if (!months.length) return '—';
    return months
      .slice()
      .sort((a, b) => a - b)
      .map((m) => this.formatTriggerMonth(m))
      .join(', ');
  }

  isPending(report: GeneratedReport): boolean {
    return isReportPending(report);
  }

  canDownload(report: GeneratedReport): boolean {
    return isReportReady(report);
  }

  private loadReportsForPeriod(year: string) {
    const yearNum = Number(year);
    return this.reportsService.listYears().pipe(
      switchMap((years) => {
        this.financialYearId = years.find((y) => y.year === yearNum)?.id ?? '';
        return this.reportsService.listByYear(yearNum, {
          perPage: PER_PAGE,
          financialYear: this.financialYearId || undefined,
        });
      }),
      catchError(() =>
        of({ count: 0, next: null, previous: null, results: [] as GeneratedReport[] }),
      ),
    );
  }

  private reloadReports() {
    if (!this.year) return;
    this.loading.set(true);
    this.loadReportsForPeriod(this.year).subscribe({
      next: (res) => {
        this.reports.set(res.results);
        this.loading.set(false);
        res.results.forEach((report) => this.ensurePolling(report));
      },
      error: (err) => {
        this.reports.set([]);
        this.loading.set(false);
        this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
      },
    });
  }

  private handleReportResult(report: GeneratedReport) {
    this.updateReportInList(report);
    this.ensurePolling(report);
    const lang = this.i18n.lang();
    if (isReportFailed(report)) {
      this.toast.error(
        report.errorMessage ?? (lang === 'en' ? 'Report failed' : 'Reporte fallido'),
      );
      this.reloadReports();
      return;
    }
    this.toast.success(lang === 'en' ? 'Report ready' : 'Reporte listo');
    if (isReportReady(report) && report.fileUrl) {
      window.open(report.fileUrl, '_blank', 'noopener');
    }
    this.reloadReports();
  }

  private ensurePolling(report: GeneratedReport) {
    if (!isReportPending(report)) return;
    if (this.pollSubs.has(report.id)) return;
    const sub = timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.reportsService.getById(report.id)),
        takeWhile((r) => isReportPending(r), true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (updated) => {
          this.updateReportInList(updated);
          if (!isReportPending(updated)) {
            this.stopPolling(updated.id);
            if (isReportFailed(updated)) {
              this.toast.error(
                updated.errorMessage ??
                  (this.i18n.lang() === 'en'
                    ? 'Report generation failed'
                    : 'Error al generar reporte'),
              );
            }
          }
        },
        error: () => this.stopPolling(report.id),
      });
    this.pollSubs.set(report.id, sub);
  }

  private updateReportInList(report: GeneratedReport) {
    this.reports.update((list) => {
      const idx = list.findIndex((r) => r.id === report.id);
      if (idx === -1) return [report, ...list];
      const next = [...list];
      next[idx] = report;
      return next;
    });
  }

  private stopPolling(id: string) {
    this.pollSubs.get(id)?.unsubscribe();
    this.pollSubs.delete(id);
  }

  private stopAllPolling() {
    this.pollSubs.forEach((sub) => sub.unsubscribe());
    this.pollSubs.clear();
  }
}
