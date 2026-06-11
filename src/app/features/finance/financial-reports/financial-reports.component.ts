import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, timer, switchMap, takeWhile } from 'rxjs';
import { GeneratedReport, FinancialYearOption } from '../models/finance.models';
import {
  FinanceReportsService,
  isReportFailed,
  isReportPending,
  isReportReady,
} from '../services/finance-reports.service';
import { financeApiErrorMessage } from '../services/finance-api.utils';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';

const POLL_INTERVAL_MS = 3000;
const PER_PAGE = 20;

@Component({
  selector: 'app-financial-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './financial-reports.component.html',
})
export class FinancialReportsComponent implements OnInit {
  private reportsService = inject(FinanceReportsService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);

  yearOptions = signal<FinancialYearOption[]>([]);
  selectedYear = signal<number | null>(null);
  reports = signal<GeneratedReport[]>([]);
  loading = signal(true);
  generating = signal(false);
  loadingMore = signal(false);
  currentPage = signal(1);
  hasMore = signal(false);
  totalCount = signal(0);
  private pollSubs = new Map<string, Subscription>();

  readonly monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  ngOnInit() {
    this.reportsService.listYears().subscribe({
      next: (years) => {
        const sorted = [...years].sort((a, b) => b.year - a.year);
        this.yearOptions.set(sorted);
        const currentYear = new Date().getFullYear();
        const initial = sorted.find((y) => y.year === currentYear)?.year ?? sorted[0]?.year ?? currentYear;
        this.selectedYear.set(initial);
        this.loadReports(true);
      },
      error: (err) => {
        this.yearOptions.set([]);
        this.selectedYear.set(new Date().getFullYear());
        this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
        this.loadReports(true);
      },
    });
    this.destroyRef.onDestroy(() => this.stopAllPolling());
  }

  yearNumbers(): number[] {
    return this.yearOptions().map((y) => y.year);
  }

  private selectedFinancialYearId(): string | undefined {
    const year = this.selectedYear();
    if (year == null) return undefined;
    return this.yearOptions().find((y) => y.year === year)?.id;
  }

  onYearChange(year: number) {
    this.selectedYear.set(year);
    this.loadReports(true);
  }

  loadReports(reset: boolean) {
    const year = this.selectedYear();
    if (year == null) return;
    if (reset) {
      this.stopAllPolling();
      this.currentPage.set(1);
      this.reports.set([]);
      this.loading.set(true);
    } else {
      this.loadingMore.set(true);
    }
    this.reportsService.listByYear(year, {
      page: this.currentPage(),
      perPage: PER_PAGE,
      financialYear: this.selectedFinancialYearId(),
    }).subscribe({
      next: (res) => {
        const merged = reset ? res.results : [...this.reports(), ...res.results];
        this.reports.set(merged);
        this.totalCount.set(res.count);
        this.hasMore.set(!!res.next);
        this.loading.set(false);
        this.loadingMore.set(false);
        merged.forEach((report) => this.ensurePolling(report));
      },
      error: (err) => {
        if (reset) this.reports.set([]);
        this.loading.set(false);
        this.loadingMore.set(false);
        this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
      },
    });
  }

  loadMore() {
    if (!this.hasMore() || this.loadingMore()) return;
    this.currentPage.update((p) => p + 1);
    this.loadReports(false);
  }

  generateReport() {
    const year = this.selectedYear();
    if (year == null || this.generating()) return;
    this.generating.set(true);
    this.reportsService.generate(year).subscribe({
      next: (report) => {
        if (isReportPending(report)) {
          this.reportsService.waitForReportCompletion(report, POLL_INTERVAL_MS).subscribe({
            next: (final) => this.onReportFinished(final, true),
            error: (err) => {
              this.generating.set(false);
              this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
              this.loadReports(true);
            },
          });
        } else {
          this.onReportFinished(report, true);
        }
      },
      error: (err) => {
        this.generating.set(false);
        this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
      },
    });
  }

  async deleteReport(report: GeneratedReport) {
    const lang = this.i18n.lang();
    const confirmed = await this.confirm.confirm(
      lang === 'en'
        ? `Delete report for year ${report.year}? The file will be removed from storage.`
        : `¿Eliminar el reporte del año ${report.year}? El archivo se borrará del almacenamiento.`,
      { variant: 'danger', confirmLabel: lang === 'en' ? 'Delete' : 'Eliminar' },
    );
    if (!confirmed) return;
    this.stopPolling(report.id);
    this.reportsService.delete(report.id).subscribe({
      next: () => {
        this.reports.update((list) => list.filter((r) => r.id !== report.id));
        this.totalCount.update((c) => Math.max(0, c - 1));
        this.toast.success(lang === 'en' ? 'Report deleted' : 'Reporte eliminado');
      },
      error: (err) => {
        this.toast.error(financeApiErrorMessage(err, lang));
        this.loadReports(true);
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
    const esMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
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

  private onReportFinished(report: GeneratedReport, fromGenerate: boolean) {
    this.generating.set(false);
    this.updateReportInList(report);
    this.ensurePolling(report);
    const lang = this.i18n.lang();
    if (isReportFailed(report)) {
      this.toast.error(report.errorMessage ?? (lang === 'en' ? 'Report generation failed' : 'Error al generar reporte'));
      return;
    }
    if (fromGenerate) {
      this.toast.success(lang === 'en' ? 'Report ready' : 'Reporte listo');
      if (isReportReady(report) && report.fileUrl) {
        window.open(report.fileUrl, '_blank', 'noopener');
      }
    }
    if (fromGenerate) this.loadReports(true);
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
                updated.errorMessage
                  ?? (this.i18n.lang() === 'en' ? 'Report generation failed' : 'Error al generar reporte'),
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
