import {
  Component,
  DestroyRef,
  EventEmitter,
  Output,
  computed,
  effect,
  inject,
  Input,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { FinanceRepository, FinanceEntry, FinanceCategory } from '../../../finance.repository';
import { bindFinancePeriodLoads, FinancePeriod } from '../../../finance-period-route.util';
import { IncomeAccountService } from '../../../services/income-account.service';
import { SavingsAccountTypeService } from '../../../services/savings-account-type.service';
import { FinanceRefreshService } from '../../../finance-refresh.service';
import { formatFinanceMoney, sumEntryAmounts } from '../../../finance.utils';
import {
  financeFormErrorMessage,
  isFieldRequired,
  validateFinanceListForm,
} from '../../../finance-form-rules';
import { ConfirmService } from '../../../../../shared/services/confirm.service';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { ToastService } from '../../../../../shared/services/toast.service';
import { DialogFormDirective } from '../../../../../shared/directives/dialog-form.directive';
import { DialogEscapeDirective } from '../../../../../shared/directives/dialog-escape.directive';
import { FinanceEntryRowComponent } from '../finance-entry-row/finance-entry-row.component';

export interface ExpenseCategoryGroup {
  categoryId: string;
  name: string;
  items: FinanceEntry[];
  total: string;
}

@Component({
  selector: 'app-finance-list-base',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DialogFormDirective,
    DialogEscapeDirective,
    FinanceEntryRowComponent,
  ],
  templateUrl: './finance-list-base.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './finance-list-base.component.scss',
})
export class FinanceListBaseComponent implements OnInit {
  repo = inject(FinanceRepository);
  incomeAccountService = inject(IncomeAccountService);
  savingsAccountTypeService = inject(SavingsAccountTypeService);
  route = inject(ActivatedRoute);
  confirm = inject(ConfirmService);
  refresh = inject(FinanceRefreshService);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  @Input() feature = '';
  @Input() isExpense = true;
  @Output() withdrawRequested = new EventEmitter<void>();

  entries = signal<FinanceEntry[]>([]);
  categories = signal<FinanceCategory[]>([]);
  loading = signal(true);
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
    isRecurring: false,
    categoryId: '',
    savingsAccountTypeId: '',
    incomeAccountId: '',
  };

  formatMoney = formatFinanceMoney;
  isRequired = isFieldRequired;

  listTotal = computed(() => sumEntryAmounts(this.entries().map((e) => e.amount)));

  showGroupedByCategory = computed(() => this.feature === 'initial-expenses');

  groupedEntries = computed((): ExpenseCategoryGroup[] => {
    const byCategory = new Map<string, FinanceEntry[]>();
    for (const entry of this.entries()) {
      const key = entry.categoryId ?? '';
      const list = byCategory.get(key) ?? [];
      list.push(entry);
      byCategory.set(key, list);
    }
    const groups: ExpenseCategoryGroup[] = [];
    const sortedCategories = [...this.categories()].sort((a, b) => {
      const orderA = a.sortOrder ?? 999;
      const orderB = b.sortOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
    for (const category of sortedCategories) {
      const items = byCategory.get(category.id);
      if (!items?.length) continue;
      groups.push({
        categoryId: category.id,
        name: category.name,
        items,
        total: sumEntryAmounts(items.map((e) => e.amount)),
      });
      byCategory.delete(category.id);
    }
    for (const [categoryId, items] of byCategory) {
      if (!items.length) continue;
      const name = categoryId
        ? items[0].categoryName || (this.i18n.lang() === 'en' ? 'Other' : 'Otro')
        : this.i18n.lang() === 'en'
          ? 'Uncategorized'
          : 'Sin categoría';
      groups.push({
        categoryId,
        name,
        items,
        total: sumEntryAmounts(items.map((e) => e.amount)),
      });
    }
    return groups;
  });

  constructor() {
    effect(() => {
      if (this.refresh.tick() === 0) return;
      if (this.year && this.month && this.feature) this.reloadEntries();
    });
  }

  ngOnInit() {
    bindFinancePeriodLoads(
      this.route,
      this.destroyRef,
      (period) => this.loadPeriodData(period),
      ({ entries, categories }, period) => {
        this.year = period.year;
        this.month = period.month;
        this.entries.set(entries);
        this.categories.set(categories);
        this.loading.set(false);
      },
      () => {
        this.entries.set([]);
        this.loading.set(true);
      },
    );
  }

  private loadPeriodData(
    period: FinancePeriod,
  ): Observable<{ entries: FinanceEntry[]; categories: FinanceCategory[] }> {
    if (!this.feature) {
      return of({ entries: [], categories: [] });
    }
    return forkJoin({
      entries: this.repo
        .listEntries(this.feature, period.year, period.month)
        .pipe(catchError(() => of([]))),
      categories: this.loadCategories$(period).pipe(catchError(() => of([]))),
    });
  }

  private loadCategories$(_period: FinancePeriod): Observable<FinanceCategory[]> {
    if (this.feature === 'initial-expenses') {
      return this.repo.listInitialExpenseCategories();
    }
    if (this.feature === 'savings') {
      return this.savingsAccountTypeService
        .list({ isActive: true })
        .pipe(map((res) => res.map((type) => ({ id: type.id, name: type.name }))));
    }
    if (this.feature === 'income') {
      return this.incomeAccountService
        .list({ isActive: true, ordering: 'name' })
        .pipe(map((res) => res.map((account) => ({ id: account.id, name: account.name }))));
    }
    return of([]);
  }

  private reloadEntries() {
    if (!this.year || !this.month || !this.feature) return;
    this.loading.set(true);
    this.repo
      .listEntries(this.feature, this.year, this.month)
      .pipe(
        catchError(() => of([])),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => this.entries.set(res));
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

  showIsRecurringField(): boolean {
    return this.isExpense;
  }

  showNotesField(): boolean {
    return this.feature === 'income' || this.feature === 'savings';
  }

  openDialog(item?: FinanceEntry) {
    if (item) {
      this.editingId = item.id;
      this.form = {
        description: this.feature === 'income' ? '' : item.description,
        amount: item.amount,
        notes: this.feature === 'income' ? (item.notes ?? item.description) : (item.notes ?? ''),
        isCash: item.isCash ?? false,
        isRecurring: item.isRecurring ?? false,
        categoryId: item.categoryId ?? '',
        savingsAccountTypeId: item.savingsAccountTypeId ?? '',
        incomeAccountId: item.incomeAccountId ?? '',
      };
    } else {
      this.editingId = null;
      this.form = {
        description:
          this.feature === 'savings' ? (this.i18n.lang() === 'en' ? 'Savings' : 'Ahorro') : '',
        amount: '',
        notes: '',
        isCash: false,
        isRecurring: false,
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
      this.reloadEntries();
      this.refresh.notify();
      this.closeDialog();
      this.toast.success(this.i18n.lang() === 'en' ? 'Entry saved' : 'Registro guardado');
    };
    const onError = () => {
      this.saving = false;
      this.toast.error(this.i18n.lang() === 'en' ? 'Error saving entry' : 'Error al guardar');
    };

    if (this.editingId) {
      this.repo
        .updateEntry(this.feature, this.editingId, data)
        .subscribe({ next: onDone, error: onError });
    } else {
      this.repo
        .createEntry(this.feature, this.year, this.month, data)
        .subscribe({ next: onDone, error: onError });
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
        this.reloadEntries();
        this.refresh.notify();
        this.toast.success(this.i18n.lang() === 'en' ? 'Entry deleted' : 'Registro eliminado');
      },
      error: () =>
        this.toast.error(this.i18n.lang() === 'en' ? 'Error deleting entry' : 'Error al eliminar'),
    });
  }

  showSpendStatus(): boolean {
    return this.isExpense;
  }

  entrySubtitle(item: FinanceEntry): string {
    const parts: string[] = [];
    if (item.categoryName && !this.showGroupedByCategory()) parts.push(item.categoryName);
    if (item.savingsAccountTypeName) parts.push(item.savingsAccountTypeName);
    if (item.incomeAccountName) parts.push(item.incomeAccountName);
    if (item.isCash) parts.push(this.i18n.lang() === 'en' ? 'Cash' : 'Efectivo');
    if (item.isRecurring) parts.push(this.i18n.lang() === 'en' ? 'Recurring' : 'Recurrente');
    if (item.notes) parts.push(item.notes);
    return parts.join(' · ');
  }
}
