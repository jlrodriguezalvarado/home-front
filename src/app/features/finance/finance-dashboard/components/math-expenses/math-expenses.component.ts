import { Component } from '@angular/core';
import { FinanceListBaseComponent } from '../finance-list-base/finance-list-base.component';

@Component({
  selector: 'app-math-expenses',
  standalone: true,
  imports: [FinanceListBaseComponent],
  templateUrl: './math-expenses.component.html',
  styleUrl: './math-expenses.component.scss',
})
export class MathExpensesComponent {}
