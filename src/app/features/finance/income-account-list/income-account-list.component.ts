import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IncomeAccount } from '../models/finance.models';
import { CurrencyCacheService } from '../services/currency-cache.service';
import { financeApiErrorMessage } from '../services/finance-api.utils';
import { IncomeAccountService } from '../services/income-account.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-income-account-list',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './income-account-list.component.html',
})
export class IncomeAccountListComponent implements OnInit {
  private readonly accountService = inject(IncomeAccountService);
  private readonly currencyCache = inject(CurrencyCacheService);
  private readonly confirm = inject(ConfirmService);
  readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  accounts = signal<IncomeAccount[]>([]);
  loading = signal(true);
  showInactive = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    const isActive = this.showInactive() ? undefined : true;
    forkJoin({
      accounts: this.accountService.list({ isActive, ordering: 'name' }),
      currencies: this.currencyCache.load(),
    }).subscribe({
      next: ({ accounts }) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: (err) => {
        this.accounts.set([]);
        this.loading.set(false);
        this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
      },
    });
  }

  toggleInactive() {
    this.showInactive.update((v) => !v);
    this.load();
  }

  currencyLabel(currencyId: string): string {
    return this.currencyCache.labelFor(currencyId);
  }

  async deleteAccount(item: IncomeAccount) {
    const message =
      this.i18n.lang() === 'en'
        ? `Delete income account "${item.name}"?`
        : `¿Eliminar la cuenta de ingreso "${item.name}"?`;
    const confirmed = await this.confirm.confirm(message, {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.accountService.delete(item.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.lang() === 'en' ? 'Account deleted' : 'Cuenta eliminada');
        this.load();
      },
      error: (err) => this.toast.error(financeApiErrorMessage(err, this.i18n.lang())),
    });
  }
}
