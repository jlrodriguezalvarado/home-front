import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExchangeRepository, ExchangeRate } from './exchange.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { Decimal } from 'decimal.js';

@Component({
  selector: 'app-exchange-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <h1 class="text-3xl font-bold">{{ i18n.t('exchangeRates') }}</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Calculator -->
        <div class="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border dark:border-gray-800">
          <h2 class="text-xl font-bold mb-4">Calculator</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm mb-1">Amount</label>
              <input type="number" [(ngModel)]="amount" (ngModelChange)="calculate()" class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent outline-none focus:ring-2 focus:ring-primary">
            </div>
            <div class="flex gap-4 items-end">
              <div class="flex-1">
                <label class="block text-sm mb-1">From</label>
                <input type="text" [(ngModel)]="from" (ngModelChange)="calculate()" class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent uppercase outline-none focus:ring-2 focus:ring-primary">
              </div>
              <button (click)="swap()" class="p-2 mb-1 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200">⇄</button>
              <div class="flex-1">
                <label class="block text-sm mb-1">To</label>
                <input type="text" [(ngModel)]="to" (ngModelChange)="calculate()" class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent uppercase outline-none focus:ring-2 focus:ring-primary">
              </div>
            </div>
            <div class="p-4 bg-primary/10 rounded-xl text-center">
              <div class="text-sm text-primary mb-1">Result</div>
              <div class="text-3xl font-bold text-primary">{{ result() }}</div>
            </div>

            <div class="pt-4 space-y-4">
               <div>
                 <label class="block text-sm mb-1">Notes</label>
                 <textarea [(ngModel)]="notes" class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent outline-none focus:ring-2 focus:ring-primary" rows="2"></textarea>
               </div>
               <button (click)="saveExchange()" [disabled]="!canSave()"
                       class="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-secondary disabled:opacity-50">
                 Save Exchange
               </button>
            </div>
          </div>
        </div>

        <!-- Latest Rates -->
        <div class="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border dark:border-gray-800">
          <h2 class="text-xl font-bold mb-4">Latest Rates</h2>
          <div class="divide-y dark:divide-gray-800">
            <div *ngFor="let rate of rates()" class="py-3 flex justify-between items-center">
              <div>
                <span class="font-medium">{{ rate.from_currency }}</span>
                <span class="mx-2 text-gray-400">→</span>
                <span class="font-medium">{{ rate.to_currency }}</span>
              </div>
              <span class="font-bold text-primary">{{ rate.rate }}</span>
            </div>
            <div *ngIf="rates().length === 0" class="py-8 text-center text-gray-500">No rates found</div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ExchangeDashboardComponent implements OnInit {
  repo = inject(ExchangeRepository);
  i18n = inject(I18nService);

  rates = signal<ExchangeRate[]>([]);
  amount = 1;
  from = 'USD';
  to = 'EUR';
  notes = '';

  result = signal('0');

  ngOnInit() {
    this.repo.latest().subscribe(res => {
      this.rates.set(res);
      this.calculate();
    });
  }

  calculate() {
    const rateObj = this.rates().find(r => r.from_currency.toUpperCase() === this.from.toUpperCase() && r.to_currency.toUpperCase() === this.to.toUpperCase());
    if (rateObj) {
      this.result.set(new Decimal(this.amount).mul(new Decimal(rateObj.rate)).toFixed(2));
    } else {
      this.result.set('---');
    }
  }

  swap() {
    const temp = this.from;
    this.from = this.to;
    this.to = temp;
    this.calculate();
  }

  canSave() {
    return this.result() !== '---' && this.amount > 0;
  }

  saveExchange() {
    const rateObj = this.rates().find(r => r.from_currency.toUpperCase() === this.from.toUpperCase() && r.to_currency.toUpperCase() === this.to.toUpperCase());
    if (!rateObj) return;

    this.repo.save({
      from_currency: this.from.toUpperCase(),
      to_currency: this.to.toUpperCase(),
      rate: rateObj.rate,
      amount: this.amount.toString(),
      result: this.result(),
      notes: this.notes
    }).subscribe({
      next: () => {
        alert('Exchange saved');
        this.notes = '';
      },
      error: () => alert('Error saving exchange')
    });
  }
}
