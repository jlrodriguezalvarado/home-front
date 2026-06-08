import { Component } from '@angular/core';
import { FinanceListBaseComponent } from './finance-list-base.component';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [FinanceListBaseComponent],
  templateUrl: './income.component.html',
  styleUrl: './income.component.scss',
})
export class IncomeComponent {}
