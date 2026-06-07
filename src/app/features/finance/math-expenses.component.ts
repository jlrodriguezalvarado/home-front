import { Component } from '@angular/core';
import { FinanceListBaseComponent } from './finance-list-base.component';

@Component({
  selector: 'app-math-expenses',
  standalone: true,
  imports: [FinanceListBaseComponent],
  template: `<app-finance-list-base [feature]="'math'"></app-finance-list-base>`
})
export class MathExpensesComponent {}
