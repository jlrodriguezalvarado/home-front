import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FinanceRepository, FinanceExchangeHistoryItem } from './finance.repository';
import { FinanceRefreshService } from './finance-refresh.service';
import { formatFinanceMoney, sumEntryAmounts } from './finance.utils';
import { CurrencyRepository } from '../currency/currency.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-finance-exchange-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exchange-history.component.html',
  styleUrl: './exchange-history.component.scss',
})
export class FinanceExchangeHistoryComponent implements OnInit {
  repo = inject(FinanceRepository);
  currencyRepo = inject(CurrencyRepository);
  route = inject(ActivatedRoute);
  refresh = inject(FinanceRefreshService);
  i18n = inject(I18nService);
  toast = inject(ToastService);

  entries = signal<FinanceExchangeHistoryItem[]>([]);
  currencies = signal<string[]>([]);
  year = '';
  month = '';
  showDialog = false;
  saving = false;
  form = {
    sourceCurrency: 'USD',
    targetCurrency: 'CLP',
    amount: '1',
    notes: '',
  };

  formatMoney = formatFinanceMoney;

  ngOnInit() {
    this.currencyRepo.list().subscribe({
      next: (res) => {
        const codes = res.filter((c) => c.active).map((c) => c.code);
        this.currencies.set(codes.length ? codes : ['USD', 'CLP', 'EUR']);
        if (codes.length >= 2) {
          this.form.sourceCurrency = codes[0];
          this.form.targetCurrency = codes[1];
        }
      },
      error: () => this.currencies.set(['USD', 'CLP', 'EUR']),
    });

    const paramRoute = this.findYearMonthRoute();
    if (!paramRoute) return;

    paramRoute.paramMap.subscribe((params) => {
      const year = params.get('year');
      const month = params.get('month');
      if (!year || !month) return;
      this.year = year;
      this.month = month;
      this.load();
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

  load() {
    this.repo.listExchangeHistory(this.year, this.month).subscribe({
      next: (res) => this.entries.set(res),
      error: () => this.entries.set([]),
    });
  }

  listTotal(): string {
    return sumEntryAmounts(this.entries().map((e) => e.amount));
  }

  openDialog() {
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
  }

  canConfirm(): boolean {
    const amount = String(this.form.amount ?? '').trim();
    return (
      !!amount &&
      /^-?\d{0,16}(?:\.\d{0,2})?$/.test(amount) &&
      Number(amount) > 0 &&
      !!this.form.sourceCurrency &&
      !!this.form.targetCurrency &&
      this.form.sourceCurrency !== this.form.targetCurrency
    );
  }

  confirmExchange() {
    if (!this.canConfirm()) {
      this.toast.error(
        this.i18n.lang() === 'en'
          ? 'Amount and different currencies are required'
          : 'Monto y monedas distintas son obligatorios',
      );
      return;
    }
    this.saving = true;
    this.repo
      .confirmExchangeCalculator({
        sourceCurrency: this.form.sourceCurrency,
        targetCurrency: this.form.targetCurrency,
        amount: this.form.amount,
        notes: this.form.notes || undefined,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.load();
          this.refresh.notify();
          this.closeDialog();
          this.form.notes = '';
          this.toast.success(this.i18n.lang() === 'en' ? 'Exchange confirmed' : 'Cambio confirmado');
        },
        error: () => {
          this.saving = false;
          this.toast.error(this.i18n.lang() === 'en' ? 'Error confirming exchange' : 'Error al confirmar cambio');
        },
      });
  }
}
