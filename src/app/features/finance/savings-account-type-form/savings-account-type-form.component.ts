import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AppCurrency } from '../models/finance.models';
import { CurrencyCacheService } from '../services/currency-cache.service';
import { financeApiErrorMessage } from '../services/finance-api.utils';
import { SavingsAccountTypeService } from '../services/savings-account-type.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-savings-account-type-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './savings-account-type-form.component.html',
})
export class SavingsAccountTypeFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly typeService = inject(SavingsAccountTypeService);
  private readonly currencyCache = inject(CurrencyCacheService);
  readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  typeId: string | null = null;
  loading = signal(true);
  saving = false;
  currencies = signal<AppCurrency[]>([]);
  form = {
    name: '',
    currencyId: '',
    isActive: true,
  };

  ngOnInit() {
    this.typeId = this.route.snapshot.paramMap.get('id');
    const loaders = {
      currencies: this.currencyCache.load(),
      type: this.typeId ? this.typeService.getById(this.typeId) : null,
    };
    if (loaders.type) {
      forkJoin({ currencies: loaders.currencies, type: loaders.type }).subscribe({
        next: ({ currencies, type }) => {
          this.currencies.set(currencies.filter((c) => c.isActive));
          this.form = {
            name: type.name,
            currencyId: type.currencyId,
            isActive: type.isActive,
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
    const request = this.typeId
      ? this.typeService.update(this.typeId, payload)
      : this.typeService.create(payload);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.i18n.lang() === 'en' ? 'Type saved' : 'Tipo guardado');
        this.router.navigate(['/finance/savings-account-types']);
      },
      error: (err) => {
        this.saving = false;
        this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
      },
    });
  }
}
