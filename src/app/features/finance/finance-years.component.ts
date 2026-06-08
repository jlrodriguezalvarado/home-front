import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FinanceRepository, FinancialYear } from './finance.repository';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-finance-years',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './finance-years.component.html',
})
export class FinanceYearsComponent implements OnInit {
  repo = inject(FinanceRepository);
  router = inject(Router);
  i18n = inject(I18nService);

  years = signal<FinancialYear[]>([]);
  selectedYear = signal<number | null>(null);
  monthsWithData = signal<number[]>([]);
  loading = signal(true);

  readonly monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  ngOnInit() {
    this.repo.listFinancialYears().subscribe({
      next: (res) => {
        const sorted = [...res].sort((a, b) => b.year - a.year);
        this.years.set(sorted);
        this.loading.set(false);
        if (sorted.length) this.selectYear(sorted[0].year);
      },
      error: () => {
        this.years.set([]);
        this.loading.set(false);
      },
    });
  }

  selectYear(year: number) {
    this.selectedYear.set(year);
    this.repo.getMonthsForYear(year).subscribe({
      next: (months) => this.monthsWithData.set(months),
      error: () => this.monthsWithData.set([]),
    });
  }

  goToMonth(month: number) {
    const year = this.selectedYear();
    if (year == null) return;
    this.router.navigate(['/finance', year, month]);
  }

  hasData(month: number): boolean {
    return this.monthsWithData().includes(month);
  }
}
