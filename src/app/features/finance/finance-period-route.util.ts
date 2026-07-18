import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, Observable, filter, map, switchMap } from 'rxjs';

export interface FinancePeriod {
  year: string;
  month: string;
}

export function findFinanceYearMonthRoute(route: ActivatedRoute): ActivatedRoute | null {
  let current: ActivatedRoute | null = route;
  while (current) {
    if (current.snapshot.paramMap.has('year') && current.snapshot.paramMap.has('month')) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

export function financePeriodChanges(route: ActivatedRoute): Observable<FinancePeriod> {
  const paramRoute = findFinanceYearMonthRoute(route);
  if (!paramRoute) {
    return EMPTY;
  }
  return paramRoute.paramMap.pipe(
    map((params) => {
      const year = params.get('year');
      const month = params.get('month');
      return year && month ? { year, month } : null;
    }),
    filter((period): period is FinancePeriod => period !== null),
  );
}

export function bindFinancePeriodLoads<T>(
  route: ActivatedRoute,
  destroyRef: DestroyRef,
  loader: (period: FinancePeriod) => Observable<T>,
  onResult: (result: T, period: FinancePeriod) => void,
  onStart?: (period: FinancePeriod) => void,
): void {
  financePeriodChanges(route)
    .pipe(
      switchMap((period) => {
        onStart?.(period);
        return loader(period).pipe(map((result) => ({ result, period })));
      }),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe(({ result, period }) => onResult(result, period));
}
