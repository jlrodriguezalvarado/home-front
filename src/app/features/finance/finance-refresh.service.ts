import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FinanceRefreshService {
  readonly tick = signal(0);

  notify(): void {
    this.tick.update((v) => v + 1);
  }
}
