import { Component } from '@angular/core';
import { FinanceListBaseComponent } from './finance-list-base.component';

@Component({
  selector: 'app-declaration',
  standalone: true,
  imports: [FinanceListBaseComponent],
  template: `<app-finance-list-base [feature]="'declaration'"></app-finance-list-base>`
})
export class DeclarationComponent {}
