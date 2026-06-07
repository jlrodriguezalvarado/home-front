import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FinanceRepository } from './finance.repository';
import { environment } from '../../../environments/environment';

describe('FinanceRepository', () => {
  let repo: FinanceRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FinanceRepository]
    });
    repo = TestBed.inject(FinanceRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should get monthly summary and map snake_case to camelCase', () => {
    const apiResponse = {
      month: '6',
      year: '2026',
      total_income: '1000.00',
      total_expenses: '500.00',
      balance: '500.00',
      categories: [],
    };
    const expected = {
      month: '6',
      year: '2026',
      totalIncome: '1000.00',
      totalExpenses: '500.00',
      balance: '500.00',
      categories: [],
    };

    repo.getMonthlySummary('2026', '6').subscribe((res) => {
      expect(res).toEqual(expected);
    });

    const req = httpMock.expectOne(`${environment.API_BASE_URL}finance/month-summary/2026/6/`);
    expect(req.request.method).toBe('GET');
    req.flush(apiResponse);
  });
});
