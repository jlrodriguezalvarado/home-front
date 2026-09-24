import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FinanceListBaseComponent } from '../finance-list-base/finance-list-base.component';

@Component({
  selector: 'app-initial-expenses',
  standalone: true,
  imports: [FinanceListBaseComponent],
  templateUrl: './initial-expenses.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './initial-expenses.component.scss',
})
export class InitialExpensesComponent {}
