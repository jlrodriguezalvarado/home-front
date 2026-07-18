import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SavingsAccountTypeService } from './savings-account-type.service';
import { apiUrl } from '../../../core/api/api-url';
import { API_ENDPOINTS } from '../../../core/api/endpoints';

describe('SavingsAccountTypeService', () => {
  let service: SavingsAccountTypeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(SavingsAccountTypeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create savings account type payload', () => {
    service.create({
      name: 'USD Savings',
      currencyId: 'cur-1',
      isActive: true,
    }).subscribe((type) => {
      expect(type.name).toBe('USD Savings');
      expect(type.currencyId).toBe('cur-1');
      expect(type.isActive).toBeTrue();
    });

    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.savingsAccountTypes));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'USD Savings',
      currency: 'cur-1',
      is_active: true,
    });
    req.flush({ id: 'type-1', name: 'USD Savings', currency: 'cur-1', is_active: true });
  });

  it('should filter active types client-side', () => {
    service.list({ isActive: true }).subscribe((types) => {
      expect(types.length).toBe(1);
      expect(types[0].name).toBe('Active');
    });

    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.savingsAccountTypes));
    req.flush({
      results: [
        { id: 'type-1', name: 'Active', currency: 'cur-1', is_active: true },
        { id: 'type-2', name: 'Inactive', currency: 'cur-1', is_active: false },
      ],
    });
  });
});
