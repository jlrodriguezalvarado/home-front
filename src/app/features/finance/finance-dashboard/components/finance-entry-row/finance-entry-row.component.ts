import { Component, EventEmitter, Input, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceEntry } from '../../../finance.repository';
import { formatFinanceMoney } from '../../../finance.utils';
import { I18nService } from '../../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-finance-entry-row',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './finance-entry-row.component.html',
  styleUrl: './finance-entry-row.component.scss',
})
export class FinanceEntryRowComponent {
  i18n = inject(I18nService);
  formatMoney = formatFinanceMoney;
  @Input({ required: true }) item!: FinanceEntry;
  @Input() isExpense = true;
  @Input() showSpendStatus = false;
  @Input() subtitle = '';
  @Output() edit = new EventEmitter<FinanceEntry>();
  @Output() remove = new EventEmitter<string>();
}
