import { Component } from '@angular/core';
import { FinanceListBaseComponent } from './finance-list-base.component';

@Component({
  selector: 'app-initial-expenses',
  standalone: true,
  imports: [FinanceListBaseComponent],
  template: `<app-finance-list-base [feature]="'initial-expenses'"></app-finance-list-base>`
})
export class InitialExpensesComponent {}
