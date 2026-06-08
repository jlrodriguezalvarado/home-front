import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { FinanceRepository, FinanceSummary } from './finance.repository';
import { FinanceRefreshService } from './finance-refresh.service';
import { formatFinanceMoney } from './finance.utils';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../shared/services/toast.service';

interface SummaryMetric {
  labelEn: string;
  labelEs: string;
  value: string;
  colorClass: string;
}

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './finance-dashboard.component.html',
  styleUrl: './finance-dashboard.component.scss',
})
export class FinanceDashboardComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  repo = inject(FinanceRepository);
  refresh = inject(FinanceRefreshService);
  i18n = inject(I18nService);
  toast = inject(ToastService);

  year = signal('');
  month = signal('');
  summary = signal<FinanceSummary | null>(null);
  loading = signal(false);

  formatMoney = formatFinanceMoney;

  tabs = [
    { path: 'initial-expenses', labelEn: 'Initial', labelEs: 'Inicial' },
    { path: 'math', labelEn: 'Math', labelEs: 'Math' },
    { path: 'home', labelEn: 'Home', labelEs: 'Hogar' },
    { path: 'savings', labelEn: 'Savings', labelEs: 'Ahorros' },
    { path: 'income', labelEn: 'Income', labelEs: 'Ingresos' },
    { path: 'exchange-history', labelEn: 'Exchange', labelEs: 'Cambio' },
    { path: 'declaration', labelEn: 'Declaration', labelEs: 'Declaración' },
    { path: 'reports', labelEn: 'Reports', labelEs: 'Reportes' },
  ];

  constructor() {
    effect(() => {
      if (this.refresh.tick() === 0) return;
      if (this.year() && this.month()) this.loadSummary();
    });
  }

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.year.set(params['year']);
      this.month.set(params['month']);
      this.loadSummary();
    });
  }

  loadSummary() {
    const year = this.year();
    const month = this.month();
    if (!year || !month) return;

    this.loading.set(true);
    this.repo.getMonthlySummary(year, month).subscribe({
      next: (res) => {
        this.summary.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.summary.set(null);
        this.loading.set(false);
        this.toast.error(
          this.i18n.lang() === 'en'
            ? 'Could not load month summary'
            : 'No se pudo cargar el resumen del mes',
        );
      },
    });
  }

  metrics(): SummaryMetric[] {
    const s = this.summary();
    if (!s) return [];
    return [
      { labelEn: 'Month income', labelEs: 'Ingreso del mes', value: s.totalIncome, colorClass: 'text-secondary' },
      { labelEn: 'Month expense', labelEs: 'Gasto del mes', value: s.totalExpenses, colorClass: 'text-error' },
      { labelEn: 'Initial month expense', labelEs: 'Gasto inicial del mes', value: s.initialMonthExpense, colorClass: 'text-orange-600' },
      { labelEn: 'Current global savings', labelEs: 'Ahorro global actual', value: s.currentGlobalSavings, colorClass: 'text-amber-700' },
      { labelEn: 'Previous global savings', labelEs: 'Ahorro global anterior', value: s.previousGlobalSavings, colorClass: 'text-amber-900' },
      { labelEn: 'Total global savings', labelEs: 'Ahorro global total', value: s.totalGlobalSavings, colorClass: 'text-teal-600' },
      { labelEn: 'Next month expense', labelEs: 'Gasto próximo mes', value: s.nextMonthExpense, colorClass: 'text-purple-600' },
      { labelEn: 'Initial month remainder', labelEs: 'Remanente inicial del mes', value: s.initialMonthRemainder, colorClass: 'text-blue-grey' },
      { labelEn: 'Available', labelEs: 'Disponible', value: s.balance, colorClass: 'text-primary' },
      { labelEn: 'Available next month', labelEs: 'Disponible próximo mes', value: s.availableNextMonth, colorClass: 'text-indigo-600' },
      { labelEn: 'Cash', labelEs: 'Efectivo', value: s.cash, colorClass: 'text-green-600' },
      { labelEn: 'Total math', labelEs: 'Total math', value: s.totalMath, colorClass: 'text-purple-700' },
      { labelEn: 'Total Mach', labelEs: 'Total Mach', value: s.totalMach, colorClass: 'text-cyan-600' },
      { labelEn: 'Total Mach (CLP)', labelEs: 'Total Mach (CLP)', value: s.totalMachInClp, colorClass: 'text-cyan-700' },
      { labelEn: 'Previous month remainder', labelEs: 'Remanente mes anterior', value: s.previousMonthRemainder, colorClass: 'text-on-surface-variant' },
    ];
  }

  metricLabel(m: SummaryMetric): string {
    return this.i18n.lang() === 'en' ? m.labelEn : m.labelEs;
  }

  tabLabel(tab: { labelEn: string; labelEs: string }): string {
    return this.i18n.lang() === 'en' ? tab.labelEn : tab.labelEs;
  }

  isSummary() {
    return this.route.snapshot.children.length === 0;
  }

  prevMonth() {
    let y = parseInt(this.year());
    let m = parseInt(this.month()) - 1;
    if (m === 0) {
      m = 12;
      y--;
    }
    this.router.navigate(['/finance', y, m]);
  }

  nextMonth() {
    let y = parseInt(this.year());
    let m = parseInt(this.month()) + 1;
    if (m === 13) {
      m = 1;
      y++;
    }
    this.router.navigate(['/finance', y, m]);
  }
}
