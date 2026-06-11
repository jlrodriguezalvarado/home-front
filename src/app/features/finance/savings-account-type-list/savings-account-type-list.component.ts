import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SavingsAccountType } from '../models/finance.models';
import { CurrencyCacheService } from '../services/currency-cache.service';
import { financeApiErrorMessage } from '../services/finance-api.utils';
import { SavingsAccountTypeService } from '../services/savings-account-type.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-savings-account-type-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './savings-account-type-list.component.html',
})
export class SavingsAccountTypeListComponent implements OnInit {
  private readonly typeService = inject(SavingsAccountTypeService);
  private readonly currencyCache = inject(CurrencyCacheService);
  private readonly confirm = inject(ConfirmService);
  readonly i18n = inject(I18nService);
  private readonly toast = inject(ToastService);

  types = signal<SavingsAccountType[]>([]);
  loading = signal(true);
  showInactive = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    const isActive = this.showInactive() ? undefined : true;
    forkJoin({
      types: this.typeService.list({ isActive }),
      currencies: this.currencyCache.load(),
    }).subscribe({
      next: ({ types }) => {
        this.types.set(types);
        this.loading.set(false);
      },
      error: (err) => {
        this.types.set([]);
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

  async deleteType(item: SavingsAccountType) {
    const message =
      this.i18n.lang() === 'en'
        ? `Delete savings account type "${item.name}"?`
        : `¿Eliminar el tipo de cuenta de ahorro "${item.name}"?`;
    const confirmed = await this.confirm.confirm(message, {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.typeService.delete(item.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.lang() === 'en' ? 'Type deleted' : 'Tipo eliminado');
        this.load();
      },
      error: (err) => this.toast.error(financeApiErrorMessage(err, this.i18n.lang())),
    });
  }
}
