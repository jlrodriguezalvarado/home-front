import { Component } from '@angular/core';
import { FinanceListBaseComponent } from './finance-list-base.component';

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [FinanceListBaseComponent],
  templateUrl: './savings.component.html',
  styleUrl: './savings.component.scss',
})
export class SavingsComponent {}
