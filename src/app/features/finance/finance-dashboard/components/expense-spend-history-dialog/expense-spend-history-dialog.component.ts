import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpenseSpendBatch } from '../../../models/finance.models';
import { ExpenseSpendService } from '../../../services/expense-spend.service';
import { FinanceRefreshService } from '../../../finance-refresh.service';
import { formatFinanceMoney } from '../../../finance.utils';
import { financeApiErrorMessage } from '../../../services/finance-api.utils';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { ToastService } from '../../../../../shared/services/toast.service';

@Component({
  selector: 'app-expense-spend-history-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expense-spend-history-dialog.component.html',
  styleUrl: './expense-spend-history-dialog.component.scss',
})
export class ExpenseSpendHistoryDialogComponent implements OnChanges {
  private readonly expenseSpendService = inject(ExpenseSpendService);
  private readonly refresh = inject(FinanceRefreshService);
  i18n = inject(I18nService);
  toast = inject(ToastService);

  @Input({ required: true }) financialMonthId = '';
  @Output() closed = new EventEmitter<void>();

  batches = signal<ExpenseSpendBatch[]>([]);
  loading = signal(false);

  formatMoney = formatFinanceMoney;

  constructor() {
    effect(() => {
      if (this.refresh.tick() === 0) return;
      if (this.financialMonthId) this.load();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['financialMonthId'] && this.financialMonthId) {
      this.load();
    }
  }

  load() {
    if (!this.financialMonthId) return;
    this.loading.set(true);
    this.expenseSpendService.getHistory(this.financialMonthId).subscribe({
      next: (res) => {
        this.batches.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        this.batches.set([]);
        this.loading.set(false);
        this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
      },
    });
  }

  close() {
    this.closed.emit();
  }

  expenseTypeLabel(type: string): string {
    const lang = this.i18n.lang();
    switch (type) {
      case 'initial':
        return lang === 'en' ? 'Initial' : 'Inicial';
      case 'math':
        return 'Math';
      case 'home':
        return lang === 'en' ? 'Home' : 'Hogar';
      case 'savings':
        return lang === 'en' ? 'Savings' : 'Ahorros';
      default:
        return type;
    }
  }
}
