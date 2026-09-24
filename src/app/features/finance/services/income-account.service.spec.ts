import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { IncomeAccountService } from './income-account.service';
import { FinanceWorkspaceService } from './finance-workspace.service';
import { apiUrl } from '../../../core/api/api-url';
import { API_ENDPOINTS } from '../../../core/api/endpoints';

describe('IncomeAccountService', () => {
  let service: IncomeAccountService;
  let httpMock: HttpTestingController;
  const workspaceId = 'ws-1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: FinanceWorkspaceService, useValue: { resolveActiveId: () => of(workspaceId) } },
      ],
    });
    service = TestBed.inject(IncomeAccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create income account payload', () => {
    service.create({
      name: 'Salary',
      currencyId: 'cur-1',
      isActive: true,
    }).subscribe((account) => {
      expect(account.name).toBe('Salary');
      expect(account.currencyId).toBe('cur-1');
      expect(account.isActive).toBeTrue();
    });

    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.incomeAccounts));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Salary',
      currency: 'cur-1',
      is_active: true,
      workspace: workspaceId,
    });
    req.flush({ id: 'acc-1', name: 'Salary', currency: 'cur-1', is_active: true });
  });

  it('should list with is_active filter', () => {
    service.list({ isActive: true }).subscribe((accounts) => {
      expect(accounts.length).toBe(1);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === apiUrl(API_ENDPOINTS.finance.incomeAccounts) &&
        r.params.get('workspace') === workspaceId,
    );
    expect(req.request.params.get('is_active')).toBe('true');
    req.flush({ results: [{ id: 'acc-1', name: 'Salary', currency: 'cur-1', is_active: true }] });
  });
});
