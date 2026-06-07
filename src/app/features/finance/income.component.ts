import { Component } from '@angular/core';
import { FinanceListBaseComponent } from './finance-list-base.component';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [FinanceListBaseComponent],
  template: `<app-finance-list-base [feature]="'income'" [isExpense]="false"></app-finance-list-base>`
})
export class IncomeComponent {}
