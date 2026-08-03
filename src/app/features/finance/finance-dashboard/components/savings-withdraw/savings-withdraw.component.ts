import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { IncomeAccount, SavingsAccountType } from '../../../models/finance.models';
import { IncomeAccountService } from '../../../services/income-account.service';
import { SavingsAccountTypeService } from '../../../services/savings-account-type.service';
import { SavingsWithdrawService } from '../../../services/savings-withdraw.service';
import { formatFinanceMoney } from '../../../finance.utils';
import { financeApiErrorMessage } from '../../../services/finance-api.utils';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { ToastService } from '../../../../../shared/services/toast.service';
import { DialogFormDirective } from '../../../../../shared/directives/dialog-form.directive';
import { DialogEscapeDirective } from '../../../../../shared/directives/dialog-escape.directive';

@Component({
  selector: 'app-savings-withdraw',
  standalone: true,
  imports: [FormsModule, DialogFormDirective, DialogEscapeDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './savings-withdraw.component.html',
})
export class SavingsWithdrawComponent implements OnChanges {
  private readonly savingsWithdrawService = inject(SavingsWithdrawService);
  private readonly savingsAccountTypeService = inject(SavingsAccountTypeService);
  private readonly incomeAccountService = inject(IncomeAccountService);
  i18n = inject(I18nService);
  toast = inject(ToastService);

  @Input({ required: true }) financialMonthId = '';
  @Input({ required: true }) totalGlobalSavings = '0';
  @Output() closed = new EventEmitter<void>();
  @Output() withdrawn = new EventEmitter<void>();

  savingsAccountTypes = signal<SavingsAccountType[]>([]);
  incomeAccounts = signal<IncomeAccount[]>([]);
  loading = signal(false);
  saving = signal(false);
  savingsAccountTypeId = '';
  incomeAccountId = '';
  amount = '';
  notes = '';
  formatMoney = formatFinanceMoney;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['financialMonthId'] && this.financialMonthId) {
      this.resetForm();
      this.loadCatalogs();
    }
  }

  loadCatalogs() {
    this.loading.set(true);
    forkJoin({
      types: this.savingsAccountTypeService.list({ isActive: true }),
      accounts: this.incomeAccountService.list({ isActive: true, ordering: 'name' }),
    }).subscribe({
      next: ({ types, accounts }) => {
        this.savingsAccountTypes.set(types);
        this.incomeAccounts.set(accounts);
        this.loading.set(false);
      },
      error: (err) => {
        this.savingsAccountTypes.set([]);
        this.incomeAccounts.set([]);
        this.loading.set(false);
        this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
      },
    });
  }

  maxAmountHint(): string {
    return this.i18n
      .t('savingsWithdrawAmountMax')
      .replace('{amount}', this.formatMoney(this.totalGlobalSavings));
  }

  canSubmit(): boolean {
    const amountNum = Number(String(this.amount).replace(',', '.'));
    const maxNum = Number(String(this.totalGlobalSavings).replace(',', '.'));
    return (
      !!this.savingsAccountTypeId &&
      !!this.incomeAccountId &&
      Number.isFinite(amountNum) &&
      amountNum > 0 &&
      Number.isFinite(maxNum) &&
      amountNum <= maxNum
    );
  }

  close() {
    this.closed.emit();
  }

  submit() {
    if (!this.canSubmit()) {
      this.toast.error(this.i18n.t('savingsWithdrawInvalidAmount'));
      return;
    }
    this.saving.set(true);
    this.savingsWithdrawService
      .create({
        financialMonthId: this.financialMonthId,
        savingsAccountTypeId: this.savingsAccountTypeId,
        incomeAccountId: this.incomeAccountId,
        amount: String(this.amount).trim().replace(',', '.'),
        notes: this.notes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success(this.i18n.t('savingsWithdrawSuccess'));
          this.withdrawn.emit();
          this.close();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
        },
      });
  }

  private resetForm() {
    this.savingsAccountTypeId = '';
    this.incomeAccountId = '';
    this.amount = '';
    this.notes = '';
  }
}
