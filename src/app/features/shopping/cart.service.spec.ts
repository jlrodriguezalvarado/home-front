import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { Product } from '../../core/api/models';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CartService', () => {
  let service: CartService;

  const mockProduct: Product = {
    id: '1',
    name: 'Test Product',
    price: '10.00',
    image: null,
    commerce: { id: 'c1', name: 'Store 1', logo: null, currencyCode: 'USD' },
    category: null,
    unit: 'unit'
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(CartService);
  });

  it('should add item to cart', () => {
    service.addToCart(mockProduct, '2');
    expect(service.count()).toBe(1);
    expect(service.items()[0].quantity).toBe('2');
  });

  it('should group by commerce', () => {
    service.addToCart(mockProduct, '1');
    const groups = service.totalByCommerce();
    expect(groups.length).toBe(1);
    expect(groups[0].commerceName).toBe('Store 1');
    expect(groups[0].subtotal).toBe('10');
  });

  it('should merge quantities when adding items from order', () => {
    service.addToCart(mockProduct, '1');
    service.addItems([{ product: mockProduct, quantity: '2' }]);
    expect(service.items().length).toBe(1);
    expect(service.items()[0].quantity).toBe('3');
  });
});
