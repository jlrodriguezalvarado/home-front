import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { EMPTY, Subject, forkJoin, switchMap, tap, filter, map } from 'rxjs';
import { FinanceRepository, FinanceSummary } from '../finance.repository';
import { FinanceRefreshService } from '../finance-refresh.service';
import { formatFinanceMoney } from '../finance.utils';
import { financeFormErrorMessage, validateFinanceListForm } from '../finance-form-rules';
import { writeFinancePeriod } from '../finance-period.storage';
import { IncomeAccount, MonthlyIncomeEntry, AppCurrency } from '../models/finance.models';
import { financeApiErrorMessage } from '../services/finance-api.utils';
import { IncomeAccountService } from '../services/income-account.service';
import { IncomeEntryService } from '../services/income-entry.service';
import { CurrencyCacheService } from '../services/currency-cache.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';
import { DialogFormDirective } from '../../../shared/directives/dialog-form.directive';
import { DialogEscapeDirective } from '../../../shared/directives/dialog-escape.directive';
import { ExpenseSpendRegisterComponent } from './components/expense-spend-register/expense-spend-register.component';
import { ExpenseSpendHistoryDialogComponent } from './components/expense-spend-history-dialog/expense-spend-history-dialog.component';
import {
  SummaryMetric,
} from './components/finance-metric-card/finance-metric-card.component';
import {
  FinanceSummaryMetricsComponent,
  FinanceSummaryMetricsState,
} from './components/finance-summary-metrics/finance-summary-metrics.component';

type IncomeDialogMode = 'closed' | 'add' | 'manage' | 'edit';

const PRIMARY_METRIC_IDS = new Set(['initialExpense', 'expense', 'balance', 'availableNext', 'cash']);

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    DialogFormDirective,
    DialogEscapeDirective,
    ExpenseSpendRegisterComponent,
    ExpenseSpendHistoryDialogComponent,
    FinanceSummaryMetricsComponent,
  ],
  templateUrl: './finance-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './finance-dashboard.component.scss',
})
export class FinanceDashboardComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  repo = inject(FinanceRepository);
  incomeAccountService = inject(IncomeAccountService);
  incomeEntryService = inject(IncomeEntryService);
  currencyCache = inject(CurrencyCacheService);
  refresh = inject(FinanceRefreshService);
  confirm = inject(ConfirmService);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private refreshSummary$ = new Subject<void>();

  year = signal('');
  month = signal('');
  summary = signal<FinanceSummary | null>(null);
  loading = signal(true);
  incomeAccounts = signal<IncomeAccount[]>([]);
  incomeEntries = signal<MonthlyIncomeEntry[]>([]);
  loadingIncomeAccounts = signal(false);
  loadingIncomeEntries = signal(false);
  incomeDialogMode = signal<IncomeDialogMode>('closed');
  expenseSpendDialogOpen = signal(false);
  expenseSpendHistoryDialogOpen = signal(false);
  replicatingRecurring = signal(false);
  summaryDetailsExpanded = signal(false);
  summaryCurrencyId = signal('');
  currencies = signal<AppCurrency[]>([]);
  manualPreviousMonthExpense = signal('');
  savingManualPreviousMonthExpense = signal(false);
  manualPreviousMonthRemainder = signal('');
  savingManualPreviousMonthRemainder = signal(false);
  manualPreviousGlobalSavings = signal('');
  savingManualPreviousGlobalSavings = signal(false);
  savingIncome = false;
  editingIncomeEntryId: string | null = null;
  incomeForm = {
    amount: '',
    notes: '',
    incomeAccountId: '',
  };
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
    this.refreshSummary$
      .pipe(
        switchMap(() => {
          const year = this.year();
          const month = this.month();
          if (!year || !month) return EMPTY;
          return this.loadSummary$(year, month);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.setSummary(res);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error(
            this.i18n.lang() === 'en'
              ? 'Could not refresh month summary'
              : 'No se pudo actualizar el resumen del mes',
          );
        },
      });
    effect(() => {
      if (this.refresh.tick() === 0) return;
      this.refreshSummary$.next();
      if (this.incomeDialogMode() === 'manage') this.loadIncomeEntries();
    });
  }

  ngOnInit() {
    this.currencyCache.load().subscribe({
      next: (list) => this.currencies.set(list.filter((c) => c.isActive)),
      error: () => {
        this.toast.error(
          this.i18n.lang() === 'en'
            ? 'Could not load currencies'
            : 'No se pudieron cargar las monedas',
        );
      },
    });
    this.route.params
      .pipe(
        map((params) => {
          const year = params['year'];
          const month = params['month'];
          return year && month ? { year, month } : null;
        }),
        filter((period): period is { year: string; month: string } => period !== null),
        tap(({ year, month }) => {
          this.year.set(year);
          this.month.set(month);
          writeFinancePeriod(Number(year), Number(month));
          this.beginPeriodLoad();
        }),
        switchMap(({ year, month }) =>
          this.loadSummary$(year, month).pipe(map((res) => ({ year, month, res }))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ year, month, res }) => {
          this.setSummary(res);
          this.finishPeriodLoad(year, month);
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

  private loadSummary$(year: string, month: string) {
    const currency = this.summaryCurrencyId();
    return this.repo.getMonthlySummary(year, month, currency ? { currency } : undefined);
  }

  private setSummary(summary: FinanceSummary) {
    this.summary.set(summary);
    this.manualPreviousMonthExpense.set(summary.previousMonthExpense);
    this.manualPreviousMonthRemainder.set(summary.previousMonthRemainder);
    this.manualPreviousGlobalSavings.set(summary.previousGlobalSavings);
  }

  onSummaryCurrencyChange(currencyId: string) {
    this.summaryCurrencyId.set(currencyId);
    this.loading.set(true);
    this.refreshSummary$.next();
  }

  private beginPeriodLoad() {
    this.refresh.beginPeriodChange();
    this.summary.set(null);
    this.loading.set(true);
    this.summaryDetailsExpanded.set(false);
    this.closeIncomeDialog();
    this.expenseSpendDialogOpen.set(false);
    this.expenseSpendHistoryDialogOpen.set(false);
  }

  private finishPeriodLoad(year: string, month: string) {
    this.loading.set(false);
    this.refresh.completePeriodChange(year, month);
  }

  metrics = computed((): SummaryMetric[] => {
    const s = this.summary();
    if (!s) return [];
    const totalCode = s.total.currency.code || 'USD';
    const totalSymbol = s.total.currency.symbol || '$';
    return [
      {
        id: 'income',
        labelEn: 'Month income',
        labelEs: 'Ingreso del mes',
        value: s.totalIncome,
        colorClass: 'text-secondary',
        action: 'income',
      },
      {
        id: 'expense',
        labelEn: 'Month expense',
        labelEs: 'Gasto del mes',
        value: s.totalExpenses,
        colorClass: 'text-error',
      },
      {
        id: 'initialExpense',
        labelEn: 'Initial expense',
        labelEs: 'Gasto inicial',
        value: s.initialMonthExpense,
        colorClass: 'text-orange-600',
      },
      {
        id: 'previousExpense',
        labelEn: 'Previous month expense',
        labelEs: 'Gasto mes anterior',
        value: s.previousMonthExpense,
        colorClass: 'text-on-surface-variant',
        action: 'previousMonthExpense',
      },
      {
        id: 'currentSavings',
        labelEn: 'Current global savings',
        labelEs: 'Ahorro global actual',
        value: s.currentGlobalSavings,
        colorClass: 'text-amber-700',
      },
      {
        id: 'previousSavings',
        labelEn: 'Previous global savings',
        labelEs: 'Ahorro global anterior',
        value: s.previousGlobalSavings,
        colorClass: 'text-amber-900',
        action: 'previousGlobalSavings',
      },
      {
        id: 'totalSavings',
        labelEn: 'Total global savings',
        labelEs: 'Ahorro global total',
        value: s.totalGlobalSavings,
        colorClass: 'text-teal-600',
      },
      {
        id: 'nextExpense',
        labelEn: 'Next month expense',
        labelEs: 'Gasto próximo mes',
        value: s.nextMonthExpense,
        colorClass: 'text-purple-600',
      },
      {
        id: 'initialRemainder',
        labelEn: 'Initial month remainder',
        labelEs: 'Remanente inicial del mes',
        value: s.initialMonthRemainder,
        colorClass: 'text-blue-grey',
      },
      {
        id: 'balance',
        labelEn: 'Available',
        labelEs: 'Disponible',
        value: s.balance,
        colorClass: 'text-primary',
      },
      {
        id: 'availableNext',
        labelEn: 'Available next month',
        labelEs: 'Disponible próximo mes',
        value: s.availableNextMonth,
        colorClass: 'text-indigo-600',
      },
      {
        id: 'cash',
        labelEn: 'Cash',
        labelEs: 'Efectivo',
        value: s.cash,
        colorClass: 'text-green-600',
      },
      {
        id: 'total',
        labelEn: `Total (${totalCode})`,
        labelEs: `Total (${totalCode})`,
        value: s.total.amount,
        colorClass: 'text-cyan-600',
        currencySymbol: totalSymbol,
      },
      {
        id: 'previousRemainder',
        labelEn: 'Previous month remainder',
        labelEs: 'Remanente mes anterior',
        value: s.previousMonthRemainder,
        colorClass: 'text-on-surface-variant',
        action: 'previousMonthRemainder',
      },
    ];
  });

  primaryMetrics = computed(() => this.metrics().filter((m) => PRIMARY_METRIC_IDS.has(m.id)));
  secondaryMetrics = computed(() => this.metrics().filter((m) => !PRIMARY_METRIC_IDS.has(m.id)));
  previousMonthExpenseEditable = computed(
    () => this.summary()?.previousMonthExpenseEditable === true,
  );
  previousMonthRemainderEditable = computed(
    () => this.summary()?.previousMonthRemainderEditable === true,
  );
  previousGlobalSavingsEditable = computed(
    () => this.summary()?.previousGlobalSavingsEditable === true,
  );
  metricsEditorState = computed<FinanceSummaryMetricsState>(() => ({
    previousMonthExpenseEditable: this.previousMonthExpenseEditable(),
    manualPreviousMonthExpense: this.manualPreviousMonthExpense(),
    savingManualPreviousMonthExpense: this.savingManualPreviousMonthExpense(),
    canSaveManualPreviousMonthExpense: this.canSaveManualPreviousMonthExpense(),
    previousMonthRemainderEditable: this.previousMonthRemainderEditable(),
    manualPreviousMonthRemainder: this.manualPreviousMonthRemainder(),
    savingManualPreviousMonthRemainder: this.savingManualPreviousMonthRemainder(),
    canSaveManualPreviousMonthRemainder: this.canSaveManualPreviousMonthRemainder(),
    previousGlobalSavingsEditable: this.previousGlobalSavingsEditable(),
    manualPreviousGlobalSavings: this.manualPreviousGlobalSavings(),
    savingManualPreviousGlobalSavings: this.savingManualPreviousGlobalSavings(),
    canSaveManualPreviousGlobalSavings: this.canSaveManualPreviousGlobalSavings(),
  }));
  moreDetailsLabel = computed(() =>
    this.i18n.lang() === 'en' ? 'More summary details' : 'Más detalles del resumen',
  );

  toggleSummaryDetails() {
    this.summaryDetailsExpanded.update((open) => !open);
  }

  canSaveManualPreviousMonthExpense(): boolean {
    const amount = this.manualPreviousMonthExpense().trim();
    return amount === '' || /^\d+(?:\.\d{1,2})?$/.test(amount);
  }

  canSaveManualPreviousMonthRemainder(): boolean {
    const amount = this.manualPreviousMonthRemainder().trim();
    return amount === '' || /^\d+(?:\.\d{1,2})?$/.test(amount);
  }

  canSaveManualPreviousGlobalSavings(): boolean {
    const amount = this.manualPreviousGlobalSavings().trim();
    return amount === '' || /^\d+(?:\.\d{1,2})?$/.test(amount);
  }

  saveManualPreviousMonthExpense() {
    const summary = this.summary();
    const amount = this.manualPreviousMonthExpense().trim();
    if (!summary?.financialMonthId || this.savingManualPreviousMonthExpense() || !this.canSaveManualPreviousMonthExpense()) {
      return;
    }
    this.savingManualPreviousMonthExpense.set(true);
    this.repo
      .updateManualPreviousMonthExpense(summary.financialMonthId, amount || null)
      .pipe(switchMap(() => this.loadSummary$(this.year(), this.month())))
      .subscribe({
        next: (updatedSummary) => {
          this.setSummary(updatedSummary);
          this.savingManualPreviousMonthExpense.set(false);
          this.toast.success(
            this.i18n.lang() === 'en'
              ? 'Previous month expense saved'
              : 'Gasto del mes anterior guardado',
          );
        },
        error: (err) => {
          this.savingManualPreviousMonthExpense.set(false);
          this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
        },
      });
  }

  saveManualPreviousMonthRemainder() {
    const summary = this.summary();
    const amount = this.manualPreviousMonthRemainder().trim();
    if (
      !summary?.financialMonthId ||
      this.savingManualPreviousMonthRemainder() ||
      !this.canSaveManualPreviousMonthRemainder()
    ) {
      return;
    }
    this.savingManualPreviousMonthRemainder.set(true);
    this.repo
      .updateManualPreviousMonthRemainder(summary.financialMonthId, amount || null)
      .pipe(switchMap(() => this.loadSummary$(this.year(), this.month())))
      .subscribe({
        next: (updatedSummary) => {
          this.setSummary(updatedSummary);
          this.savingManualPreviousMonthRemainder.set(false);
          this.toast.success(
            this.i18n.lang() === 'en'
              ? 'Previous month remainder saved'
              : 'Remanente del mes anterior guardado',
          );
        },
        error: (err) => {
          this.savingManualPreviousMonthRemainder.set(false);
          this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
        },
      });
  }

  saveManualPreviousGlobalSavings() {
    const summary = this.summary();
    const amount = this.manualPreviousGlobalSavings().trim();
    if (!summary?.financialMonthId || this.savingManualPreviousGlobalSavings() || !this.canSaveManualPreviousGlobalSavings()) {
      return;
    }
    this.savingManualPreviousGlobalSavings.set(true);
    this.repo
      .updateManualPreviousGlobalSavings(summary.financialMonthId, amount || null)
      .pipe(switchMap(() => this.loadSummary$(this.year(), this.month())))
      .subscribe({
        next: (updatedSummary) => {
          this.setSummary(updatedSummary);
          this.savingManualPreviousGlobalSavings.set(false);
          this.toast.success(
            this.i18n.lang() === 'en'
              ? 'Previous global savings saved'
              : 'Ahorro global anterior guardado',
          );
        },
        error: (err) => {
          this.savingManualPreviousGlobalSavings.set(false);
          this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
        },
      });
  }

  tabLabel(tab: { labelEn: string; labelEs: string }): string {
    return this.i18n.lang() === 'en' ? tab.labelEn : tab.labelEs;
  }

  prevMonth() {
    let y = parseInt(this.year());
    let m = parseInt(this.month()) - 1;
    if (m === 0) {
      m = 12;
      y--;
    }
    this.navigateMonth(y, m);
  }

  nextMonth() {
    let y = parseInt(this.year());
    let m = parseInt(this.month()) + 1;
    if (m === 13) {
      m = 1;
      y++;
    }
    this.navigateMonth(y, m);
  }

  private navigateMonth(year: number, month: number) {
    writeFinancePeriod(year, month);
    const child = this.route.snapshot.firstChild?.url[0]?.path;
    if (child) {
      this.router.navigate(['/finance', year, month, child]);
      return;
    }
    this.router.navigate(['/finance', year, month]);
  }

  incomeDialogTitle(): string {
    const lang = this.i18n.lang();
    switch (this.incomeDialogMode()) {
      case 'add':
        return lang === 'en' ? 'Add income entry' : 'Agregar ingreso';
      case 'edit':
        return lang === 'en' ? 'Edit income entry' : 'Editar ingreso';
      case 'manage':
        return lang === 'en' ? 'Monthly income entries' : 'Ingresos del mes';
      default:
        return '';
    }
  }

  incomeAccountName(accountId: string): string {
    const match = this.incomeAccounts().find((account) => account.id === accountId);
    return match?.name ?? accountId;
  }

  openIncomeAddDialog() {
    if (!this.summary()) return;
    this.resetIncomeForm();
    this.incomeDialogMode.set('add');
    this.loadIncomeAccounts();
  }

  openIncomeManageDialog() {
    if (!this.summary()) return;
    this.incomeDialogMode.set('manage');
    this.loadIncomeAccounts();
    this.loadIncomeEntries();
  }

  openIncomeEditDialog(entry: MonthlyIncomeEntry) {
    this.editingIncomeEntryId = entry.id;
    this.incomeForm = {
      amount: entry.amount,
      notes: entry.notes ?? '',
      incomeAccountId: entry.incomeAccountId,
    };
    this.incomeDialogMode.set('edit');
    if (this.incomeAccounts().length === 0) this.loadIncomeAccounts();
  }

  closeIncomeDialog() {
    this.incomeDialogMode.set('closed');
    this.editingIncomeEntryId = null;
    this.loadingIncomeAccounts.set(false);
    this.loadingIncomeEntries.set(false);
    this.resetIncomeForm();
  }

  backIncomeDialog() {
    if (this.incomeDialogMode() === 'edit') {
      this.editingIncomeEntryId = null;
      this.resetIncomeForm();
      this.incomeDialogMode.set('manage');
      return;
    }
    this.closeIncomeDialog();
  }

  private resetIncomeForm() {
    this.incomeForm = { amount: '', notes: '', incomeAccountId: '' };
  }

  private loadIncomeAccounts() {
    this.loadingIncomeAccounts.set(true);
    this.incomeAccountService.list({ isActive: true, ordering: 'name' }).subscribe({
      next: (res) => {
        this.incomeAccounts.set(res);
        this.loadingIncomeAccounts.set(false);
      },
      error: (err) => {
        this.incomeAccounts.set([]);
        this.loadingIncomeAccounts.set(false);
        this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
      },
    });
  }

  loadIncomeEntries() {
    const year = this.year();
    const month = this.month();
    if (!year || !month) return;
    this.loadingIncomeEntries.set(true);
    const entries$ = this.incomeEntryService.listByYearMonth(year, month);
    const onError = (err: unknown) => {
      this.incomeEntries.set([]);
      this.loadingIncomeEntries.set(false);
      this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
    };
    if (this.incomeAccounts().length > 0) {
      entries$.subscribe({
        next: (entries) => {
          this.incomeEntries.set(entries);
          this.loadingIncomeEntries.set(false);
        },
        error: onError,
      });
      return;
    }
    forkJoin({
      entries: entries$,
      accounts: this.incomeAccountService.list({ isActive: true, ordering: 'name' }),
    }).subscribe({
      next: ({ entries, accounts }) => {
        this.incomeEntries.set(entries);
        this.incomeAccounts.set(accounts);
        this.loadingIncomeEntries.set(false);
      },
      error: onError,
    });
  }

  canSaveIncome(): boolean {
    return (
      validateFinanceListForm('income', {
        description: '',
        amount: this.incomeForm.amount,
        notes: this.incomeForm.notes,
        isCash: false,
        isRecurring: false,
        categoryId: '',
        savingsAccountTypeId: '',
        incomeAccountId: this.incomeForm.incomeAccountId,
      }) === null
    );
  }

  saveIncome() {
    const errorKey = validateFinanceListForm('income', {
      description: '',
      amount: this.incomeForm.amount,
      notes: this.incomeForm.notes,
      isCash: false,
      isRecurring: false,
      categoryId: '',
      savingsAccountTypeId: '',
      incomeAccountId: this.incomeForm.incomeAccountId,
    });
    if (errorKey) {
      this.toast.error(financeFormErrorMessage(errorKey, this.i18n.lang()));
      return;
    }
    this.savingIncome = true;
    const payload = {
      incomeAccountId: this.incomeForm.incomeAccountId,
      amount: this.incomeForm.amount.trim(),
      notes: this.incomeForm.notes.trim() || undefined,
    };
    const onError = (err: unknown) => {
      this.savingIncome = false;
      this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
    };
    const onSaved = () => {
      this.savingIncome = false;
      this.refresh.notify();
      this.toast.success(this.i18n.lang() === 'en' ? 'Entry saved' : 'Registro guardado');
    };
    if (this.incomeDialogMode() === 'edit' && this.editingIncomeEntryId) {
      this.incomeEntryService.update(this.editingIncomeEntryId, payload).subscribe({
        next: () => {
          onSaved();
          this.editingIncomeEntryId = null;
          this.resetIncomeForm();
          this.incomeDialogMode.set('manage');
          this.loadIncomeEntries();
        },
        error: onError,
      });
      return;
    }
    this.incomeEntryService.createForYearMonth(this.year(), this.month(), payload).subscribe({
      next: () => {
        onSaved();
        this.closeIncomeDialog();
      },
      error: onError,
    });
  }

  openExpenseSpendDialog() {
    if (!this.summary()?.financialMonthId) return;
    this.expenseSpendDialogOpen.set(true);
  }

  closeExpenseSpendDialog() {
    this.expenseSpendDialogOpen.set(false);
  }

  openExpenseSpendHistoryDialog() {
    if (!this.summary()?.financialMonthId) return;
    this.expenseSpendHistoryDialogOpen.set(true);
  }

  closeExpenseSpendHistoryDialog() {
    this.expenseSpendHistoryDialogOpen.set(false);
  }

  onExpenseSpendRegistered() {
    this.refresh.notify();
  }

  async replicateRecurringExpenses() {
    const financialMonthId = this.summary()?.financialMonthId;
    if (!financialMonthId || this.replicatingRecurring()) return;
    const lang = this.i18n.lang();
    const confirmed = await this.confirm.confirm(
      lang === 'en'
        ? 'Copy recurring expenses from the previous month into this month?'
        : '¿Copiar los gastos recurrentes del mes anterior a este mes?',
      {
        confirmLabel: lang === 'en' ? 'Replicate' : 'Replicar',
      },
    );
    if (!confirmed) return;
    this.replicatingRecurring.set(true);
    this.repo.replicateRecurringExpenses(financialMonthId).subscribe({
      next: (result) => {
        this.replicatingRecurring.set(false);
        this.refresh.notify();
        const message =
          result.createdCount === 0 && result.skippedCount === 0
            ? lang === 'en'
              ? 'No recurring expenses found in the previous month'
              : 'No se encontraron gastos recurrentes en el mes anterior'
            : lang === 'en'
              ? `Replicated ${result.createdCount} expense(s), skipped ${result.skippedCount}`
              : `Se replicaron ${result.createdCount} gasto(s), se omitieron ${result.skippedCount}`;
        this.toast.success(message);
      },
      error: (err) => {
        this.replicatingRecurring.set(false);
        this.toast.error(financeApiErrorMessage(err, lang));
      },
    });
  }

  async deleteIncomeEntry(entry: MonthlyIncomeEntry) {
    const confirmed = await this.confirm.confirm(this.i18n.t('areYouSure'), {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.incomeEntryService.delete(entry.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.lang() === 'en' ? 'Entry deleted' : 'Registro eliminado');
        this.refresh.notify();
        this.loadIncomeEntries();
      },
      error: (err) => this.toast.error(financeApiErrorMessage(err, this.i18n.lang())),
    });
  }
}
