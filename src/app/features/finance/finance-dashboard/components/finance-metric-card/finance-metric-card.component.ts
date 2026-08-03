import { Component, EventEmitter, Input, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { formatFinanceMoney } from '../../../finance.utils';
import { I18nService } from '../../../../../core/i18n/i18n.service';

export interface SummaryMetric {
  id: string;
  labelEn: string;
  labelEs: string;
  value: string;
  colorClass: string;
  currencySymbol?: string;
  action?: 'income' | 'previousMonthExpense' | 'previousMonthRemainder' | 'previousGlobalSavings';
}

@Component({
  selector: 'app-finance-metric-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './finance-metric-card.component.html',
})
export class FinanceMetricCardComponent {
  i18n = inject(I18nService);
  @Input({ required: true }) metric!: SummaryMetric;
  @Input() previousMonthExpenseEditable = false;
  @Input() manualPreviousMonthExpense = '';
  @Input() savingManualPreviousMonthExpense = false;
  @Input() canSaveManualPreviousMonthExpense = false;
  @Input() previousMonthRemainderEditable = false;
  @Input() manualPreviousMonthRemainder = '';
  @Input() savingManualPreviousMonthRemainder = false;
  @Input() canSaveManualPreviousMonthRemainder = false;
  @Input() previousGlobalSavingsEditable = false;
  @Input() manualPreviousGlobalSavings = '';
  @Input() savingManualPreviousGlobalSavings = false;
  @Input() canSaveManualPreviousGlobalSavings = false;
  @Output() manualPreviousMonthExpenseChange = new EventEmitter<string>();
  @Output() manualPreviousMonthRemainderChange = new EventEmitter<string>();
  @Output() manualPreviousGlobalSavingsChange = new EventEmitter<string>();
  @Output() manageIncome = new EventEmitter<void>();
  @Output() addIncome = new EventEmitter<void>();
  @Output() savePreviousMonthExpense = new EventEmitter<void>();
  @Output() savePreviousMonthRemainder = new EventEmitter<void>();
  @Output() savePreviousGlobalSavings = new EventEmitter<void>();

  label(): string {
    return this.i18n.lang() === 'en' ? this.metric.labelEn : this.metric.labelEs;
  }

  formattedValue(): string {
    if (this.metric.currencySymbol) {
      const n = Number(this.metric.value ?? 0);
      const symbol = this.metric.currencySymbol;
      if (!Number.isFinite(n)) return `${symbol}0.00`;
      return `${symbol}${n.toFixed(2)}`;
    }
    return formatFinanceMoney(this.metric.value);
  }
}
