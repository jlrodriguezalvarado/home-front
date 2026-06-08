import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  FinanceRepository,
  isReportPending,
  isReportReady,
  isReportFailed,
} from './finance.repository';
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
        total_math: '100.00',
        total_mach: '30.00',
        total_mach_in_clp: '25000.00',
      },
    };

    repo.getMonthlySummary('2026', '6').subscribe((res) => {
      expect(res.financialMonthId).toBe('month-1');
      expect(res.totalIncome).toBe('1000.00');
      expect(res.totalExpenses).toBe('500.00');
      expect(res.balance).toBe('500.00');
      expect(res.initialMonthExpense).toBe('80.00');
      expect(res.totalMachInClp).toBe('25000.00');
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
      financial_month: 'month-1',
    });
    createReq.flush({ id: '1', name: 'Test', amount: '10.00', is_cash: true });
  });

  it('should map initial expense payload with expense_category', () => {
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
      financial_month: 'month-1',
      expense_category: 'cat-1',
    });
    createReq.flush({ id: '1', name: 'Rent', amount: '500.00', expense_category: 'cat-1' });
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
    expect(isReportPending({ id: '1', status: 'processing' })).toBeTrue();
    expect(isReportReady({ id: '1', status: 'completed', fileUrl: 'http://x.pdf' })).toBeTrue();
    expect(isReportFailed({ id: '1', status: 'failed' })).toBeTrue();
  });
});
