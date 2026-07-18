import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FinanceRepository } from './finance.repository';
import {
  isReportPending,
  isReportReady,
  isReportFailed,
} from './services/finance-reports.service';
import { GeneratedReport } from './models/finance.models';
import { apiUrl } from '../../core/api/api-url';
import { API_ENDPOINTS } from '../../core/api/endpoints';

describe('FinanceRepository', () => {
  let repo: FinanceRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FinanceRepository],
    });
    repo = TestBed.inject(FinanceRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should get monthly summary with all summary fields', () => {
    const apiResponse = {
      financial_month_id: 'month-1',
      year: 2026,
      month: 6,
      summary: {
        month_income: '1000.00',
        month_expense: '500.00',
        available: '500.00',
        available_next_month: '450.00',
        initial_month_expense: '80.00',
        previous_month_remainder: '100.00',
        initial_month_remainder: '20.00',
        next_month_expense: '60.00',
        current_global_savings: '150.00',
        previous_global_savings: '50.00',
        total_global_savings: '200.00',
        cash: '50.00',
        total: {
          amount: '800.00',
          currency: {
            id: 'cur-clp',
            code: 'CLP',
            name: 'Chilean Peso',
            symbol: '$',
          },
        },
      },
    };

    repo.getMonthlySummary('2026', '6').subscribe((res) => {
      expect(res.financialMonthId).toBe('month-1');
      expect(res.totalIncome).toBe('1000.00');
      expect(res.totalExpenses).toBe('500.00');
      expect(res.balance).toBe('500.00');
      expect(res.initialMonthExpense).toBe('80.00');
      expect(res.total.amount).toBe('800.00');
      expect(res.total.currency.code).toBe('CLP');
      expect(res.total.currency.symbol).toBe('$');
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === apiUrl(API_ENDPOINTS.finance.monthSummary) &&
        r.params.get('year') === '2026' &&
        r.params.get('month') === '6',
    );
    expect(req.request.method).toBe('GET');
    req.flush(apiResponse);
  });

  it('should pass currency query param when requested', () => {
    const apiResponse = {
      financial_month_id: 'month-1',
      year: 2026,
      month: 6,
      summary: {
        month_income: '0',
        month_expense: '0',
        available: '0',
        available_next_month: '0',
        initial_month_expense: '0',
        previous_month_remainder: '0',
        initial_month_remainder: '0',
        next_month_expense: '0',
        current_global_savings: '0',
        previous_global_savings: '0',
        total_global_savings: '0',
        cash: '0',
        total: {
          amount: '100.00',
          currency: { id: 'cur-usd', code: 'USD', name: 'US Dollar', symbol: '$' },
        },
      },
    };

    repo.getMonthlySummary('2026', '6', { currency: 'cur-usd' }).subscribe((res) => {
      expect(res.total.amount).toBe('100.00');
      expect(res.total.currency.code).toBe('USD');
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === apiUrl(API_ENDPOINTS.finance.monthSummary) &&
        r.params.get('year') === '2026' &&
        r.params.get('month') === '6' &&
        r.params.get('currency') === 'cur-usd',
    );
    expect(req.request.method).toBe('GET');
    req.flush(apiResponse);
  });

  it('should resolve financial month via years and months endpoints', () => {
    repo.resolveFinancialMonth('2026', '6').subscribe((id) => {
      expect(id).toBe('month-1');
    });

    const yearsReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.years));
    yearsReq.flush([{ id: 'year-1', year: 2026 }]);

    const monthsReq = httpMock.expectOne(
      (r) =>
        r.url === apiUrl(API_ENDPOINTS.finance.months) &&
        r.params.get('financial_year') === 'year-1' &&
        r.params.get('month_number') === '6',
    );
    monthsReq.flush([{ id: 'month-1', month_number: 6 }]);
  });

  it('should map math expense payload with is_cash', () => {
    repo.createEntry('math', '2026', '6', {
      description: 'Test',
      amount: '10.00',
      isCash: true,
    }).subscribe((entry) => {
      expect(entry.description).toBe('Test');
    });

    const yearsReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.years));
    yearsReq.flush([{ id: 'year-1', year: 2026 }]);

    const monthsReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.months));
    monthsReq.flush([{ id: 'month-1', month_number: 6 }]);

    const createReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.resources.math));
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual({
      name: 'Test',
      amount: '10.00',
      is_cash: true,
      is_recurring: false,
      financial_month: 'month-1',
    });
    createReq.flush({ id: '1', name: 'Test', amount: '10.00', is_cash: true });
  });

  it('should map math expense payload with is_recurring', () => {
    repo.createEntry('math', '2026', '6', {
      description: 'Rent',
      amount: '100.00',
      isCash: false,
      isRecurring: true,
    }).subscribe((entry) => {
      expect(entry.isRecurring).toBeTrue();
    });

    const yearsReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.years));
    yearsReq.flush([{ id: 'year-1', year: 2026 }]);

    const monthsReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.months));
    monthsReq.flush([{ id: 'month-1', month_number: 6 }]);

    const createReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.resources.math));
    expect(createReq.request.body).toEqual({
      name: 'Rent',
      amount: '100.00',
      is_cash: false,
      is_recurring: true,
      financial_month: 'month-1',
    });
    createReq.flush({ id: '1', name: 'Rent', amount: '100.00', is_recurring: true });
  });

  it('should replicate recurring expenses for financial month', () => {
    repo.replicateRecurringExpenses('month-2').subscribe((result) => {
      expect(result.financialMonthId).toBe('month-2');
      expect(result.previousMonthId).toBe('month-1');
      expect(result.createdCount).toBe(2);
      expect(result.skippedCount).toBe(1);
      expect(result.created.mathExpenseItems[0].name).toBe('Internet');
    });

    const req = httpMock.expectOne(
      (r) => r.url === apiUrl(API_ENDPOINTS.finance.recurringExpensesReplicate),
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ financial_month: 'month-2' });
    req.flush({
      financial_month_id: 'month-2',
      previous_month_id: 'month-1',
      created: {
        initial_expense_items: [],
        math_expense_items: [
          { expense_type: 'math', id: 'new-1', name: 'Internet', amount: '50.00', is_recurring: true },
        ],
        home_expense_items: [
          { expense_type: 'home', id: 'new-2', name: 'Water', amount: '20.00', is_recurring: true },
        ],
      },
      skipped: {
        initial_expense_items: [
          {
            expense_type: 'initial',
            source_id: 'src-1',
            name: 'Rent',
            reason: 'already_exists_in_target_month',
            category_id: 'cat-1',
          },
        ],
        math_expense_items: [],
        home_expense_items: [],
      },
      created_count: 2,
      skipped_count: 1,
    });
  });

  it('should map savings item payload with notes', () => {
    repo.createEntry('savings', '2026', '6', {
      description: 'Ahorro',
      amount: '200',
      isCash: false,
      savingsAccountTypeId: 'type-1',
      notes: 'Ahorro mensual',
    }).subscribe();

    const yearsReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.years));
    yearsReq.flush([{ id: 'year-1', year: 2026 }]);

    const monthsReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.months));
    monthsReq.flush([{ id: 'month-1', month_number: 6 }]);

    const createReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.resources.savings));
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual({
      name: 'Ahorro',
      amount: '200',
      is_cash: false,
      financial_month: 'month-1',
      savings_account_type: 'type-1',
      notes: 'Ahorro mensual',
    });
    createReq.flush({
      id: '1',
      name: 'Ahorro',
      amount: '200',
      is_cash: false,
      savings_account_type: 'type-1',
      notes: 'Ahorro mensual',
    });
  });

  it('should map initial expense payload with category', () => {
    repo.createEntry('initial-expenses', '2026', '6', {
      description: 'Rent',
      amount: '500.00',
      categoryId: 'cat-1',
    }).subscribe();

    const yearsReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.years));
    yearsReq.flush([{ id: 'year-1', year: 2026 }]);

    const monthsReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.months));
    monthsReq.flush([{ id: 'month-1', month_number: 6 }]);

    const createReq = httpMock.expectOne(
      (r) => r.url === apiUrl(API_ENDPOINTS.finance.resources['initial-expenses']),
    );
    expect(createReq.request.body).toEqual({
      name: 'Rent',
      amount: '500.00',
      is_cash: false,
      is_recurring: false,
      financial_month: 'month-1',
      category: 'cat-1',
    });
    createReq.flush({ id: '1', name: 'Rent', amount: '500.00', category: 'cat-1' });
  });

  it('should list initial expense categories from correct endpoint', () => {
    repo.listInitialExpenseCategories().subscribe((cats) => {
      expect(cats.length).toBe(1);
      expect(cats[0].name).toBe('Rent');
    });

    const req = httpMock.expectOne(
      (r) => r.url === apiUrl(API_ENDPOINTS.finance.initialExpenseCategories),
    );
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'cat-1', name: 'Rent' }]);
  });

  it('should list active income accounts with is_active filter', () => {
    repo.listIncomeAccounts().subscribe((accounts) => {
      expect(accounts.length).toBe(1);
      expect(accounts[0].id).toBe('acc-1');
      expect(accounts[0].name).toBe('Salary');
    });

    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.incomeAccounts));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('is_active')).toBe('true');
    req.flush({
      results: [
        { id: 'acc-1', name: 'Salary', is_active: true, currency: 'cur-1' },
      ],
    });
  });

  it('should map income payload with required income_account', () => {
    repo.createEntry('income', '2026', '6', {
      amount: '1000.00',
      incomeAccountId: 'acc-1',
      notes: 'Salary',
    }).subscribe();

    const yearsReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.years));
    yearsReq.flush([{ id: 'year-1', year: 2026 }]);

    const monthsReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.months));
    monthsReq.flush([{ id: 'month-1', month_number: 6 }]);

    const createReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.resources.income));
    expect(createReq.request.body).toEqual({
      amount: '1000.00',
      income_account: 'acc-1',
      financial_month: 'month-1',
      notes: 'Salary',
    });
    createReq.flush({ id: '1', amount: '1000.00', income_account: 'acc-1', notes: 'Salary' });
  });

  it('should evaluate report status helpers', () => {
    const base: GeneratedReport = {
      id: '1',
      financialYear: 'fy-1',
      year: 2026,
      triggeredFromMonth: null,
      file: null,
      fileUrl: '',
      status: 'processing',
      errorMessage: null,
      createdAt: '',
      updatedAt: '',
      generatedBy: null,
      includedMonths: [],
    };
    expect(isReportPending({ ...base, status: 'processing' })).toBeTrue();
    expect(isReportReady({ ...base, status: 'completed', fileUrl: 'http://x.pdf' })).toBeTrue();
    expect(isReportFailed({ ...base, status: 'failed' })).toBeTrue();
  });
});
