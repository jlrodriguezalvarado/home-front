import {
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { FinanceRepository, FinanceExchangeHistoryItem } from '../../../finance.repository';
import { FinanceRefreshService } from '../../../finance-refresh.service';
import { bindFinancePeriodLoads } from '../../../finance-period-route.util';
import { formatFinanceMoney, sumEntryAmounts } from '../../../finance.utils';
import { CurrencyRepository } from '../../../../currency/currency.repository';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { ToastService } from '../../../../../shared/services/toast.service';
import { DialogFormDirective } from '../../../../../shared/directives/dialog-form.directive';
import { DialogEscapeDirective } from '../../../../../shared/directives/dialog-escape.directive';

@Component({
  selector: 'app-finance-exchange-history',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogFormDirective, DialogEscapeDirective],
  templateUrl: './exchange-history.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './exchange-history.component.scss',
})
export class FinanceExchangeHistoryComponent implements OnInit {
  repo = inject(FinanceRepository);
  currencyRepo = inject(CurrencyRepository);
  route = inject(ActivatedRoute);
  refresh = inject(FinanceRefreshService);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  entries = signal<FinanceExchangeHistoryItem[]>([]);
  currencies = signal<string[]>([]);
  loading = signal(true);
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

  constructor() {
    effect(() => {
      if (this.refresh.tick() === 0) return;
      if (this.year && this.month) this.reloadEntries();
    });
  }

  ngOnInit() {
    this.currencyRepo
      .list()
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        const codes = res.filter((c) => c.active).map((c) => c.code);
        this.currencies.set(codes.length ? codes : ['USD', 'CLP', 'EUR']);
        if (codes.length >= 2) {
          this.form.sourceCurrency = codes[0];
          this.form.targetCurrency = codes[1];
        }
      });
    bindFinancePeriodLoads(
      this.route,
      this.destroyRef,
      (period) =>
        this.repo.listExchangeHistory(period.year, period.month).pipe(catchError(() => of([]))),
      (entries, period) => {
        this.year = period.year;
        this.month = period.month;
        this.entries.set(entries);
        this.loading.set(false);
      },
      () => {
        this.entries.set([]);
        this.loading.set(true);
      },
    );
  }

  private reloadEntries() {
    if (!this.year || !this.month) return;
    this.loading.set(true);
    this.repo
      .listExchangeHistory(this.year, this.month)
      .pipe(
        catchError(() => of([])),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((entries) => this.entries.set(entries));
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
          this.reloadEntries();
          this.refresh.notify();
          this.closeDialog();
          this.form.notes = '';
          this.toast.success(
            this.i18n.lang() === 'en' ? 'Exchange confirmed' : 'Cambio confirmado',
          );
        },
        error: () => {
          this.saving = false;
          this.toast.error(
            this.i18n.lang() === 'en' ? 'Error confirming exchange' : 'Error al confirmar cambio',
          );
        },
      });
  }
}
