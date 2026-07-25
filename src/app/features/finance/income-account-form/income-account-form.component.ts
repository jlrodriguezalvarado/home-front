import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AppCurrency } from '../models/finance.models';
import { CurrencyCacheService } from '../services/currency-cache.service';
import { financeApiErrorMessage } from '../services/finance-api.utils';
import { IncomeAccountService } from '../services/income-account.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-income-account-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './income-account-form.component.html',
})
export class IncomeAccountFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountService = inject(IncomeAccountService);
  private readonly currencyCache = inject(CurrencyCacheService);
  readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  accountId: string | null = null;
  loading = signal(true);
  saving = false;
  currencies = signal<AppCurrency[]>([]);
  form = {
    name: '',
    currencyId: '',
    isActive: true,
  };

  ngOnInit() {
    this.accountId = this.route.snapshot.paramMap.get('id');
    const loaders = {
      currencies: this.currencyCache.load(),
      account: this.accountId ? this.accountService.getById(this.accountId) : null,
    };
    if (loaders.account) {
      forkJoin({ currencies: loaders.currencies, account: loaders.account }).subscribe({
        next: ({ currencies, account }) => {
          this.currencies.set(currencies.filter((c) => c.isActive));
          this.form = {
            name: account.name,
            currencyId: account.currencyId,
            isActive: account.isActive,
          };
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
        },
      });
      return;
    }
    loaders.currencies.subscribe({
      next: (currencies) => {
        this.currencies.set(currencies.filter((c) => c.isActive));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
      },
    });
  }

  canSave(): boolean {
    return this.form.name.trim().length > 0 && !!this.form.currencyId;
  }

  save() {
    if (!this.canSave()) {
      this.toast.error(
        this.i18n.lang() === 'en'
          ? 'Name and currency are required'
          : 'El nombre y la moneda son obligatorios',
      );
      return;
    }
    this.saving = true;
    const payload = {
      name: this.form.name.trim(),
      currencyId: this.form.currencyId,
      isActive: this.form.isActive,
    };
    const request = this.accountId
      ? this.accountService.update(this.accountId, payload)
      : this.accountService.create(payload);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.i18n.lang() === 'en' ? 'Account saved' : 'Cuenta guardada');
        this.router.navigate(['/finance/income-accounts']);
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
      },
    });
  }
}
