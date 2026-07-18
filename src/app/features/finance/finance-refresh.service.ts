import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FinanceRefreshService {
  readonly tick = signal(0);
  readonly periodOutletKey = signal<string | null>(null);

  notify(): void {
    this.tick.update((v) => v + 1);
  }

  beginPeriodChange(): void {
    this.periodOutletKey.set(null);
  }

  completePeriodChange(year: string, month: string): void {
    this.periodOutletKey.set(`${year}-${month}`);
  }
}
