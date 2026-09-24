/**
 * Presentational summary metrics grid for the finance dashboard.
 */
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FinanceMetricCardComponent,
  SummaryMetric,
} from '../finance-metric-card/finance-metric-card.component';

export interface FinanceSummaryMetricsState {
  previousMonthExpenseEditable: boolean;
  manualPreviousMonthExpense: string;
  savingManualPreviousMonthExpense: boolean;
  canSaveManualPreviousMonthExpense: boolean;
  previousMonthRemainderEditable: boolean;
  manualPreviousMonthRemainder: string;
  savingManualPreviousMonthRemainder: boolean;
  canSaveManualPreviousMonthRemainder: boolean;
  previousGlobalSavingsEditable: boolean;
  manualPreviousGlobalSavings: string;
  savingManualPreviousGlobalSavings: boolean;
  canSaveManualPreviousGlobalSavings: boolean;
}

@Component({
  selector: 'app-finance-summary-metrics',
  standalone: true,
  imports: [CommonModule, FinanceMetricCardComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './finance-summary-metrics.component.html',
})
export class FinanceSummaryMetricsComponent {
  @Input({ required: true }) primaryMetrics: SummaryMetric[] = [];
  @Input() secondaryMetrics: SummaryMetric[] = [];
  @Input() summaryDetailsExpanded = false;
  @Input({ required: true }) state!: FinanceSummaryMetricsState;
  @Input() moreDetailsLabel = 'More summary details';
  @Output() toggleDetails = new EventEmitter<void>();
  @Output() manualPreviousMonthExpenseChange = new EventEmitter<string>();
  @Output() manualPreviousMonthRemainderChange = new EventEmitter<string>();
  @Output() manualPreviousGlobalSavingsChange = new EventEmitter<string>();
  @Output() manageIncome = new EventEmitter<void>();
  @Output() addIncome = new EventEmitter<void>();
  @Output() savePreviousMonthExpense = new EventEmitter<void>();
  @Output() savePreviousMonthRemainder = new EventEmitter<void>();
  @Output() savePreviousGlobalSavings = new EventEmitter<void>();
}
