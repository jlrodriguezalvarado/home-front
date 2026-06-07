import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { FinanceRepository, FinanceSummary } from './finance.repository';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold">{{ i18n.t('finance') }}</h1>
        <div class="flex gap-2">
          <button (click)="prevMonth()" class="p-2 border dark:border-gray-700 rounded-lg">←</button>
          <span class="px-4 py-2 bg-white dark:bg-dark-surface rounded-lg font-bold">{{ year() }}/{{ month() }}</span>
          <button (click)="nextMonth()" class="p-2 border dark:border-gray-700 rounded-lg">→</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-900/30">
          <div class="text-sm text-green-600 dark:text-green-400">Income</div>
          <div class="text-2xl font-bold text-green-700 dark:text-green-300">{{ summary()?.totalIncome || '0.00' }}</div>
        </div>
        <div class="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
          <div class="text-sm text-red-600 dark:text-red-400">Expenses</div>
          <div class="text-2xl font-bold text-red-700 dark:text-red-300">{{ summary()?.totalExpenses || '0.00' }}</div>
        </div>
        <div class="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-100/30">
          <div class="text-sm text-blue-600 dark:text-blue-400">Balance</div>
          <div class="text-2xl font-bold text-blue-700 dark:text-blue-300">{{ summary()?.balance || '0.00' }}</div>
        </div>
      </div>

      <nav class="flex gap-4 overflow-x-auto pb-2 border-b dark:border-gray-800">
        <a *ngFor="let tab of tabs"
           [routerLink]="tab.path"
           routerLinkActive="text-primary border-b-2 border-primary"
           class="px-4 py-2 text-sm font-medium whitespace-nowrap">
           {{ tab.label }}
        </a>
      </nav>

      <router-outlet></router-outlet>

      <div *ngIf="isSummary()" class="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border dark:border-gray-800">
        <h2 class="text-xl font-bold mb-4">Expenses by Category</h2>
        <div class="space-y-4">
          <div *ngFor="let cat of summary()?.categories" class="flex flex-col gap-1">
            <div class="flex justify-between text-sm">
              <span>{{ cat.name }}</span>
              <span class="font-bold">{{ cat.total }}</span>
            </div>
            <div class="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div class="h-full bg-primary" style="width: 50%"></div> <!-- Mock width for now -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FinanceDashboardComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  repo = inject(FinanceRepository);
  i18n = inject(I18nService);

  year = signal('');
  month = signal('');
  summary = signal<FinanceSummary | null>(null);

  tabs = [
    { path: 'initial-expenses', label: 'Initial' },
    { path: 'math', label: 'Math' },
    { path: 'home', label: 'Home' },
    { path: 'savings', label: 'Savings' },
    { path: 'income', label: 'Income' },
    { path: 'declaration', label: 'Declaration' },
    { path: 'exchange-history', label: 'Exchange' },
    { path: 'reports', label: 'Reports' },
  ];

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.year.set(params['year']);
      this.month.set(params['month']);
      this.loadSummary();
    });
  }

  loadSummary() {
    this.repo.getMonthlySummary(this.year(), this.month()).subscribe(res => this.summary.set(res));
  }

  isSummary() {
    return this.route.snapshot.children.length === 0;
  }

  prevMonth() {
    let y = parseInt(this.year());
    let m = parseInt(this.month()) - 1;
    if (m === 0) { m = 12; y--; }
    this.router.navigate(['/finance', y, m]);
  }

  nextMonth() {
    let y = parseInt(this.year());
    let m = parseInt(this.month()) + 1;
    if (m === 13) { m = 1; y++; }
    this.router.navigate(['/finance', y, m]);
  }
}
