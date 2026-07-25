import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FinanceListBaseComponent } from '../finance-list-base/finance-list-base.component';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [FinanceListBaseComponent],
  templateUrl: './income.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './income.component.scss',
})
export class IncomeComponent {}
