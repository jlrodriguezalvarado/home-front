import { Component } from '@angular/core';
import { FinanceListBaseComponent } from './finance-list-base.component';

@Component({
  selector: 'app-home-expenses',
  standalone: true,
  imports: [FinanceListBaseComponent],
  template: `<app-finance-list-base [feature]="'home'"></app-finance-list-base>`
})
export class HomeExpensesComponent {}
