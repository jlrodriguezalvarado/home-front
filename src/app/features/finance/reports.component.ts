import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-finance-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h2 class="text-2xl font-bold">Reports</h2>

      <div class="p-6 bg-white dark:bg-dark-surface rounded-2xl border dark:border-gray-800 shadow-sm text-center">
        <p class="mb-4 text-gray-500">Generate a financial report for {{ year }}/{{ month }}</p>
        <button (click)="generate()" [disabled]="generating()"
                class="px-8 py-3 bg-primary text-white font-bold rounded-lg hover:bg-secondary disabled:opacity-50">
          {{ generating() ? 'Generating...' : 'Generate Report' }}
        </button>
      </div>

      <div class="space-y-4">
        <h3 class="text-lg font-bold">History</h3>
        <div class="bg-white dark:bg-dark-surface rounded-2xl border dark:border-gray-800 divide-y dark:divide-gray-800">
           <div *ngFor="let r of reports()" class="p-4 flex justify-between items-center">
             <div>
               <div class="font-bold">{{ r.name }}</div>
               <div class="text-xs text-gray-500">{{ r.created_at | date:'medium' }}</div>
             </div>
             <a [href]="r.file_url" target="_blank" class="text-primary font-bold">Download</a>
           </div>
           <div *ngIf="reports().length === 0" class="p-8 text-center text-gray-500">No reports found</div>
        </div>
      </div>
    </div>
  `
})
export class FinanceReportsComponent implements OnInit {
  http = inject(HttpClient);
  route = inject(ActivatedRoute);

  reports = signal<any[]>([]);
  generating = signal(false);
  year = '';
  month = '';

  ngOnInit() {
    this.route.parent?.params.subscribe(params => {
      this.year = params['year'];
      this.month = params['month'];
      this.loadHistory();
    });
  }

  loadHistory() {
    this.http.get<any[]>(`${environment.API_BASE_URL}finance/reports/`, {
      params: { year: this.year, month: this.month }
    }).subscribe(res => this.reports.set(res));
  }

  generate() {
    this.generating.set(true);
    this.http.post<any>(`${environment.API_BASE_URL}finance/reports/generate/`, {
      year: this.year,
      month: this.month
    }).subscribe({
      next: (res) => {
        alert('Report generation started');
        this.generating.set(false);
        this.loadHistory();
      },
      error: () => {
        alert('Error generating report');
        this.generating.set(false);
      }
    });
  }
}
