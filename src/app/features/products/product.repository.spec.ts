import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProductRepository } from './product.repository';
import { apiUrl } from '../../core/api/api-url';
import { API_ENDPOINTS } from '../../core/api/endpoints';

describe('ProductRepository', () => {
  let repo: ProductRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductRepository],
    });
    repo = TestBed.inject(ProductRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list products with trailing slash', () => {
    repo.list({}).subscribe();
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.products.list));
    expect(req.request.method).toBe('GET');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('should fetch product categories without trailing slash', () => {
    repo.getCategories().subscribe();
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.productCategories));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should unwrap paginated product categories', () => {
    let categories: unknown;
    repo.getCategories().subscribe((res) => (categories = res));
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.productCategories));
    req.flush({ count: 1, next: null, previous: null, results: [{ id: '1', name: 'Food' }] });
    expect(categories).toEqual([{ id: '1', name: 'Food' }]);
  });

  it('should fetch product categories filtered by commerce', () => {
    repo.getCategories({ commerce_id: 'commerce-1' }).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url === apiUrl(API_ENDPOINTS.productCategories) &&
        r.params.get('commerce_id') === 'commerce-1',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
