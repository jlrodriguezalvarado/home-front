import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { IngredientRepository } from './ingredient.repository';
import { apiUrl } from '../../../core/api/api-url';
import { API_ENDPOINTS } from '../../../core/api/endpoints';

describe('IngredientRepository', () => {
  let repo: IngredientRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [IngredientRepository],
    });
    repo = TestBed.inject(IngredientRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list ingredients from paginated response', () => {
    let result: unknown;
    repo.list().subscribe((res) => (result = res));
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.mealPlanning.ingredients.list));
    req.flush({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 'ing-1',
        name: 'Salt',
        description: '',
        default_product: null,
        is_active: true,
      }],
    });
    expect((result as { name: string }[])[0].name).toBe('Salt');
  });

  it('should list ingredients from plain array response', () => {
    let result: unknown;
    repo.list().subscribe((res) => (result = res));
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.mealPlanning.ingredients.list));
    req.flush([{
      id: 'ing-2',
      name: 'Pepper',
      description: '',
      default_product: null,
      is_active: false,
    }]);
    expect((result as { name: string; isActive: boolean }[])[0].isActive).toBe(false);
  });
});
