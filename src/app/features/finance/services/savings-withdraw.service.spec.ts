import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SavingsWithdrawService } from './savings-withdraw.service';
import { apiUrl } from '../../../core/api/api-url';
import { API_ENDPOINTS } from '../../../core/api/endpoints';

describe('SavingsWithdrawService', () => {
  let service: SavingsWithdrawService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(SavingsWithdrawService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list withdrawals for a financial month', () => {
    service.list('month-1').subscribe((items) => {
      expect(items.length).toBe(1);
      expect(items[0].id).toBe('wd-1');
      expect(items[0].financialMonthId).toBe('month-1');
      expect(items[0].savingsAccountTypeId).toBe('type-1');
      expect(items[0].amount).toBe('25.00');
      expect(items[0].incomeEntryId).toBe('inc-1');
      expect(items[0].notes).toBe('cash out');
    });
    const req = httpMock.expectOne(
      (r) =>
        r.url === apiUrl(API_ENDPOINTS.finance.savingsWithdraw) &&
        r.params.get('financial_month') === 'month-1',
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      results: [
        {
          id: 'wd-1',
          financial_month: 'month-1',
          savings_account_type: 'type-1',
          amount: '25.00',
          notes: 'cash out',
          income_entry: 'inc-1',
          created_at: '2026-08-03T12:00:00Z',
          updated_at: '2026-08-03T12:00:00Z',
        },
      ],
    });
  });

  it('should create a savings withdrawal payload', () => {
    service
      .create({
        financialMonthId: 'month-1',
        savingsAccountTypeId: 'type-1',
        incomeAccountId: 'acc-1',
        amount: '10.50',
        notes: 'need cash',
      })
      .subscribe((item) => {
        expect(item.id).toBe('wd-2');
        expect(item.amount).toBe('10.50');
      });
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.savingsWithdraw));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      financial_month: 'month-1',
      savings_account_type: 'type-1',
      income_account: 'acc-1',
      amount: '10.50',
      notes: 'need cash',
    });
    req.flush({
      id: 'wd-2',
      financial_month: 'month-1',
      savings_account_type: 'type-1',
      amount: '10.50',
      notes: 'need cash',
      income_entry: 'inc-2',
      created_at: '2026-08-03T12:00:00Z',
      updated_at: '2026-08-03T12:00:00Z',
    });
  });

  it('should delete a savings withdrawal', () => {
    service.delete('wd-1').subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === apiUrl(`${API_ENDPOINTS.finance.savingsWithdraw}wd-1/`),
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
