import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { apiUrl } from '../../core/api/api-url';
import { API_ENDPOINTS } from '../../core/api/endpoints';
import { PriceComparisonRepository } from './price-comparison.repository';

describe('PriceComparisonRepository', () => {
  let repository: PriceComparisonRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PriceComparisonRepository],
    });
    repository = TestBed.inject(PriceComparisonRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the paginated, user-scoped comparison endpoint', () => {
    let name = '';
    repository.listComparisons().subscribe((comparisons) => name = comparisons[0].name);

    const request = httpMock.expectOne(apiUrl(API_ENDPOINTS.priceComparisons.comparisons.list));
    expect(request.request.method).toBe('GET');
    request.flush({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 'comparison-1',
        name: 'Weekly basket',
        description: '',
        created_at: '2026-07-18T10:00:00Z',
        updated_at: '2026-07-18T10:00:00Z',
      }],
    });

    expect(name).toBe('Weekly basket');
  });

  it('filters child resources by comparison', () => {
    repository.listStores('comparison-1').subscribe();

    const request = httpMock.expectOne((candidate) =>
      candidate.url === apiUrl(API_ENDPOINTS.priceComparisons.stores.list)
      && candidate.params.get('comparison') === 'comparison-1');
    expect(request.request.method).toBe('GET');
    request.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('creates a price using Django write fields and preserves its decimal string', () => {
    let savedPrice = '';
    repository.createPrice({
      store_id: 'store-1',
      product_id: 'product-1',
      price: '12.50',
    }).subscribe((price) => savedPrice = price.price);

    const request = httpMock.expectOne(apiUrl(API_ENDPOINTS.priceComparisons.prices.list));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      store_id: 'store-1',
      product_id: 'product-1',
      price: '12.50',
    });
    request.flush({
      id: 'price-1',
      store: 'store-1',
      store_name: 'Market',
      product: 'product-1',
      product_name: 'Rice',
      price: '12.50',
      created_at: '2026-07-18T10:00:00Z',
      updated_at: '2026-07-18T10:00:00Z',
    });

    expect(savedPrice).toBe('12.50');
  });

  it('loads the backend-calculated report action', () => {
    repository.getReport('comparison-1').subscribe((report) => {
      expect(report.summary.storeRankings[0].total).toBe('12.50');
    });

    const request = httpMock.expectOne(
      apiUrl(API_ENDPOINTS.priceComparisons.comparisons.report('comparison-1')),
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      comparison: { id: 'comparison-1', name: 'Basket', description: '' },
      stores: [{ id: 'store-1', comparison: 'comparison-1', name: 'Market', description: '' }],
      products: [],
      summary: {
        product_count: 0,
        store_count: 1,
        priced_product_count: 0,
        cheapest_products: [],
        store_rankings: [{
          store_id: 'store-1',
          store_name: 'Market',
          total: '12.50',
          priced_products: 0,
          missing_products: 0,
          is_complete: false,
        }],
        best_complete_basket_stores: [],
      },
    });
  });
});
