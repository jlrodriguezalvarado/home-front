import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FinanceRepository, FinanceEntry, FinanceCategory } from './finance.repository';
import { FinanceRefreshService } from './finance-refresh.service';
import { formatFinanceMoney, sumEntryAmounts } from './finance.utils';
import {
  financeFormErrorMessage,
  isFieldRequired,
  validateFinanceListForm,
} from './finance-form-rules';
import { ConfirmService } from '../../shared/services/confirm.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-finance-list-base',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './finance-list-base.component.html',
  styleUrl: './finance-list-base.component.scss',
})
export class FinanceListBaseComponent implements OnInit {
  repo = inject(FinanceRepository);
  route = inject(ActivatedRoute);
  confirm = inject(ConfirmService);
  refresh = inject(FinanceRefreshService);
  i18n = inject(I18nService);
  toast = inject(ToastService);

  @Input() feature = '';
  @Input() isExpense = true;

  entries = signal<FinanceEntry[]>([]);
  categories = signal<FinanceCategory[]>([]);
  year = '';
  month = '';

  showDialog = false;
  editingId: string | null = null;
  saving = false;
  form = {
    description: '',
    amount: '',
    notes: '',
    isCash: false,
    categoryId: '',
    savingsAccountTypeId: '',
    incomeAccountId: '',
  };

  formatMoney = formatFinanceMoney;
  isRequired = isFieldRequired;

  ngOnInit() {
    const paramRoute = this.findYearMonthRoute();
    if (!paramRoute) return;

    paramRoute.paramMap.subscribe((params) => {
      const year = params.get('year');
      const month = params.get('month');
      if (!year || !month) return;
      this.year = year;
      this.month = month;
      this.loadCategories();
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

  loadCategories() {
    if (this.feature === 'initial-expenses') {
      this.repo.listExpenseCategories().subscribe({
        next: (res) => this.categories.set(res),
        error: () => this.categories.set([]),
      });
    } else if (this.feature === 'savings') {
      this.repo.listSavingsAccountTypes().subscribe({
        next: (res) => this.categories.set(res),
        error: () => this.categories.set([]),
      });
    } else if (this.feature === 'income') {
      this.repo.listIncomeAccounts().subscribe({
        next: (res) => this.categories.set(res),
        error: () => this.categories.set([]),
      });
    }
  }

  load() {
    if (!this.year || !this.month || !this.feature) return;
    this.repo.listEntries(this.feature, this.year, this.month).subscribe({
      next: (res) => this.entries.set(res),
      error: () => this.entries.set([]),
    });
  }

  listTotal(): string {
    return sumEntryAmounts(this.entries().map((e) => e.amount));
  }

  showCategoryField(): boolean {
    return this.feature === 'initial-expenses';
  }

  showSavingsTypeField(): boolean {
    return this.feature === 'savings';
  }

  showIncomeAccountField(): boolean {
    return this.feature === 'income';
  }

  showIsCashField(): boolean {
    return this.isExpense;
  }

  openDialog(item?: FinanceEntry) {
    if (item) {
      this.editingId = item.id;
      this.form = {
        description: this.feature === 'income' ? '' : item.description,
        amount: item.amount,
        notes: this.feature === 'income' ? (item.notes ?? item.description) : '',
        isCash: item.isCash ?? false,
        categoryId: item.categoryId ?? '',
        savingsAccountTypeId: item.savingsAccountTypeId ?? '',
        incomeAccountId: item.incomeAccountId ?? '',
      };
    } else {
      this.editingId = null;
      this.form = {
        description: '',
        amount: '',
        notes: '',
        isCash: false,
        categoryId: '',
        savingsAccountTypeId: '',
        incomeAccountId: '',
      };
    }
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
  }

  canSave(): boolean {
    return validateFinanceListForm(this.feature, this.form) === null;
  }

  save() {
    const errorKey = validateFinanceListForm(this.feature, this.form);
    if (errorKey) {
      this.toast.error(financeFormErrorMessage(errorKey, this.i18n.lang()));
      return;
    }
    this.saving = true;
    const data = { ...this.form };
    const onDone = () => {
      this.saving = false;
      this.load();
      this.refresh.notify();
      this.closeDialog();
      this.toast.success(this.i18n.lang() === 'en' ? 'Entry saved' : 'Registro guardado');
    };
    const onError = () => {
      this.saving = false;
      this.toast.error(this.i18n.lang() === 'en' ? 'Error saving entry' : 'Error al guardar');
    };

    if (this.editingId) {
      this.repo.updateEntry(this.feature, this.editingId, data).subscribe({ next: onDone, error: onError });
    } else {
      this.repo.createEntry(this.feature, this.year, this.month, data).subscribe({ next: onDone, error: onError });
    }
  }

  async deleteEntry(id: string) {
    const confirmed = await this.confirm.confirm(this.i18n.t('areYouSure'), {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.repo.deleteEntry(this.feature, id).subscribe({
      next: () => {
        this.load();
        this.refresh.notify();
        this.toast.success(this.i18n.lang() === 'en' ? 'Entry deleted' : 'Registro eliminado');
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Error deleting entry' : 'Error al eliminar'),
    });
  }

  entrySubtitle(item: FinanceEntry): string {
    const parts: string[] = [];
    if (item.categoryName) parts.push(item.categoryName);
    if (item.savingsAccountTypeName) parts.push(item.savingsAccountTypeName);
    if (item.incomeAccountName) parts.push(item.incomeAccountName);
    if (item.isCash) parts.push(this.i18n.lang() === 'en' ? 'Cash' : 'Efectivo');
    if (item.notes) parts.push(item.notes);
    return parts.join(' · ');
  }
}
