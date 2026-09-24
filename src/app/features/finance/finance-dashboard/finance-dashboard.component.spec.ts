import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FinanceDashboardComponent } from './finance-dashboard.component';
import { FinanceRepository, FinanceSummary } from '../finance.repository';
import { FinanceRefreshService } from '../finance-refresh.service';
import { IncomeAccountService } from '../services/income-account.service';
import { IncomeEntryService } from '../services/income-entry.service';
import { CurrencyCacheService } from '../services/currency-cache.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ActivatedRoute } from '@angular/router';

const summaryFixture: FinanceSummary = {
  financialMonthId: 'fm-1',
  month: '08',
  year: '2026',
  totalIncome: '100.00',
  totalExpenses: '40.00',
  balance: '60.00',
  availableNextMonth: '50.00',
  initialMonthExpense: '10.00',
  previousMonthExpense: '0',
  previousMonthExpenseEditable: false,
  previousMonthRemainder: '0',
  previousMonthRemainderEditable: false,
  initialMonthRemainder: '0',
  nextMonthExpense: '0',
  currentGlobalSavings: '20.00',
  previousGlobalSavings: '0',
  previousGlobalSavingsEditable: false,
  totalGlobalSavings: '20.00',
  cash: '50.00',
  total: {
    amount: '100.00',
    currency: { id: 'usd', code: 'USD', name: 'US Dollar', symbol: '$', isActive: true },
  },
};

describe('FinanceDashboardComponent', () => {
  let fixture: ComponentFixture<FinanceDashboardComponent>;
  let component: FinanceDashboardComponent;

  beforeEach(async () => {
    const repo = jasmine.createSpyObj('FinanceRepository', [
      'getMonthlySummary',
      'setManualPreviousMonthExpense',
      'setManualPreviousMonthRemainder',
      'setManualPreviousGlobalSavings',
      'replicateRecurringExpenses',
    ]);
    repo.getMonthlySummary.and.returnValue(of(summaryFixture));
    await TestBed.configureTestingModule({
      imports: [FinanceDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: FinanceRepository, useValue: repo },
        {
          provide: FinanceRefreshService,
          useValue: {
            tick: () => 0,
            periodOutletKey: () => '2026-08',
            bump: jasmine.createSpy('bump'),
            beginPeriodChange: jasmine.createSpy('beginPeriodChange'),
            completePeriodChange: jasmine.createSpy('completePeriodChange'),
          },
        },
        { provide: IncomeAccountService, useValue: { list: () => of([]) } },
        {
          provide: IncomeEntryService,
          useValue: {
            listForMonth: () => of([]),
            create: () => of({}),
            update: () => of({}),
            delete: () => of(void 0),
          },
        },
        {
          provide: CurrencyCacheService,
          useValue: { load: () => of([]), snapshot: () => [] },
        },
        { provide: ConfirmService, useValue: { confirm: () => of(true) } },
        {
          provide: I18nService,
          useValue: { t: (k: string) => k, lang: () => 'en' },
        },
        {
          provide: ToastService,
          useValue: {
            error: jasmine.createSpy('error'),
            success: jasmine.createSpy('success'),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ year: '2026', month: '08' }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FinanceDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates and exposes period signals', () => {
    expect(component).toBeTruthy();
    expect(component.year()).toBe('2026');
    expect(component.month()).toBe('08');
  });

  it('toggles summary details expansion', () => {
    expect(component.summaryDetailsExpanded()).toBeFalse();
    component.toggleSummaryDetails();
    expect(component.summaryDetailsExpanded()).toBeTrue();
  });
});
