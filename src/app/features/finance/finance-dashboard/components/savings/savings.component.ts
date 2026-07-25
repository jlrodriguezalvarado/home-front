import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FinanceListBaseComponent } from '../finance-list-base/finance-list-base.component';

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [FinanceListBaseComponent],
  templateUrl: './savings.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './savings.component.scss',
})
export class SavingsComponent {}
