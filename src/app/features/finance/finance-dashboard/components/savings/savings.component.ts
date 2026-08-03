import {
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { FinanceListBaseComponent } from '../finance-list-base/finance-list-base.component';
import { SavingsWithdrawComponent } from '../savings-withdraw/savings-withdraw.component';
import { bindFinancePeriodLoads, FinancePeriod } from '../../../finance-period-route.util';
import { FinanceRepository } from '../../../finance.repository';
import { FinanceRefreshService } from '../../../finance-refresh.service';
import { SavingsWithdrawService } from '../../../services/savings-withdraw.service';
import { SavingsAccountTypeService } from '../../../services/savings-account-type.service';
import { SavingsWithdrawal } from '../../../models/finance.models';
import { formatFinanceMoney } from '../../../finance.utils';
import { financeApiErrorMessage } from '../../../services/finance-api.utils';
import { ConfirmService } from '../../../../../shared/services/confirm.service';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { ToastService } from '../../../../../shared/services/toast.service';

interface SavingsContext {
  financialMonthId: string;
  totalGlobalSavings: string;
  withdrawals: SavingsWithdrawal[];
  typeNameById: Record<string, string>;
}

@Component({
  selector: 'app-savings',
  standalone: true,
  imports: [FinanceListBaseComponent, SavingsWithdrawComponent],
  templateUrl: './savings.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './savings.component.scss',
})
export class SavingsComponent implements OnInit {
  private readonly repo = inject(FinanceRepository);
  private readonly savingsWithdrawService = inject(SavingsWithdrawService);
  private readonly savingsAccountTypeService = inject(SavingsAccountTypeService);
  private readonly route = inject(ActivatedRoute);
  private readonly confirm = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);
  refresh = inject(FinanceRefreshService);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  year = '';
  month = '';
  financialMonthId = signal('');
  totalGlobalSavings = signal('0');
  withdrawals = signal<SavingsWithdrawal[]>([]);
  typeNameById = signal<Record<string, string>>({});
  loadingWithdrawals = signal(false);
  withdrawDialogOpen = signal(false);
  formatMoney = formatFinanceMoney;

  constructor() {
    effect(() => {
      if (this.refresh.tick() === 0) return;
      if (this.year && this.month) this.reloadContext();
    });
  }

  ngOnInit() {
    bindFinancePeriodLoads(
      this.route,
      this.destroyRef,
      (period) => this.loadContext$(period),
      (result, period) => {
        this.year = period.year;
        this.month = period.month;
        this.applyContext(result);
        this.loadingWithdrawals.set(false);
      },
      () => {
        this.loadingWithdrawals.set(true);
        this.withdrawals.set([]);
      },
    );
  }

  openWithdrawDialog() {
    if (!this.financialMonthId()) return;
    this.withdrawDialogOpen.set(true);
  }

  closeWithdrawDialog() {
    this.withdrawDialogOpen.set(false);
  }

  onWithdrawn() {
    this.refresh.notify();
  }

  typeName(typeId: string): string {
    return this.typeNameById()[typeId] || typeId;
  }

  withdrawalSubtitle(item: SavingsWithdrawal): string {
    const parts = [this.typeName(item.savingsAccountTypeId)];
    if (item.notes) parts.push(item.notes);
    return parts.join(' · ');
  }

  async deleteWithdrawal(item: SavingsWithdrawal) {
    const confirmed = await this.confirm.confirm(this.i18n.t('areYouSure'), {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.savingsWithdrawService.delete(item.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('savingsWithdrawDeleted'));
        this.refresh.notify();
      },
      error: (err) => this.toast.error(financeApiErrorMessage(err, this.i18n.lang())),
    });
  }

  private applyContext(result: SavingsContext) {
    this.financialMonthId.set(result.financialMonthId);
    this.totalGlobalSavings.set(result.totalGlobalSavings);
    this.withdrawals.set(result.withdrawals);
    this.typeNameById.set(result.typeNameById);
  }

  private emptyContext(): SavingsContext {
    return {
      financialMonthId: '',
      totalGlobalSavings: '0',
      withdrawals: [],
      typeNameById: {},
    };
  }

  private loadContext$(period: FinancePeriod): Observable<SavingsContext> {
    return forkJoin({
      summary: this.repo.getMonthlySummary(period.year, period.month).pipe(catchError(() => of(null))),
      types: this.savingsAccountTypeService.list().pipe(catchError(() => of([]))),
    }).pipe(
      switchMap(({ summary, types }) => {
        const typeNameById = Object.fromEntries(types.map((type) => [type.id, type.name]));
        if (!summary?.financialMonthId) {
          return of({ ...this.emptyContext(), typeNameById });
        }
        return this.savingsWithdrawService.list(summary.financialMonthId).pipe(
          catchError(() => of([])),
          map((withdrawals) => ({
            financialMonthId: summary.financialMonthId,
            totalGlobalSavings: summary.totalGlobalSavings,
            withdrawals,
            typeNameById,
          })),
        );
      }),
    );
  }

  private reloadContext() {
    if (!this.year || !this.month) return;
    this.loadingWithdrawals.set(true);
    this.loadContext$({ year: this.year, month: this.month })
      .pipe(
        finalize(() => this.loadingWithdrawals.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.applyContext(result));
  }
}
