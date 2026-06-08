import { Component } from '@angular/core';
import { FinanceListBaseComponent } from './finance-list-base.component';

@Component({
  selector: 'app-initial-expenses',
  standalone: true,
  imports: [FinanceListBaseComponent],
  templateUrl: './initial-expenses.component.html',
  styleUrl: './initial-expenses.component.scss',
})
export class InitialExpensesComponent {}
