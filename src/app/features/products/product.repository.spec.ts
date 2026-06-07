import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductRepository } from './product.repository';
import { environment } from '../../../environments/environment';

describe('ProductRepository', () => {
  let repo: ProductRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductRepository]
    });
    repo = TestBed.inject(ProductRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list products with trailing slash', () => {
    repo.list({}).subscribe();
    const req = httpMock.expectOne(req => req.url === `${environment.API_BASE_URL}products/`);
    expect(req.request.method).toBe('GET');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });
});
