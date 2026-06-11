import { Component } from '@angular/core';
import { FinanceListBaseComponent } from '../finance-list-base/finance-list-base.component';

@Component({
  selector: 'app-home-expenses',
  standalone: true,
  imports: [FinanceListBaseComponent],
  templateUrl: './home-expenses.component.html',
  styleUrl: './home-expenses.component.scss',
})
export class HomeExpensesComponent {}
