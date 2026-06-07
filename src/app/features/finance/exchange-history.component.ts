import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ExchangeRepository, ExchangeRate } from '../exchange/exchange.repository';

@Component({
  selector: 'app-finance-exchange-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h2 class="text-2xl font-bold">Exchange History</h2>
      <div class="bg-white dark:bg-dark-surface rounded-2xl border dark:border-gray-800 divide-y dark:divide-gray-800">
        <div *ngFor="let item of entries()" class="p-4 flex justify-between items-center">
          <div>
            <div class="font-bold">{{ item.from_currency }} → {{ item.to_currency }}</div>
            <div class="text-sm text-gray-500">{{ item.date | date }}</div>
          </div>
          <div class="font-bold text-primary">{{ item.rate }}</div>
        </div>
        <div *ngIf="entries().length === 0" class="p-8 text-center text-gray-500">No entries</div>
      </div>
    </div>
  `
})
export class FinanceExchangeHistoryComponent implements OnInit {
  repo = inject(ExchangeRepository);
  route = inject(ActivatedRoute);

  entries = signal<ExchangeRate[]>([]);
  year = '';
  month = '';

  ngOnInit() {
    this.route.parent?.params.subscribe(params => {
      this.year = params['year'];
      this.month = params['month'];
      this.load();
    });
  }

  load() {
    const monthStr = `${this.year}-${this.month.padStart(2, '0')}`;
    this.repo.history(monthStr).subscribe(res => this.entries.set(res));
  }
}
