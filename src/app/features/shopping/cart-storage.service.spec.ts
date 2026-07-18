import { TestBed } from '@angular/core/testing';
import { CartStorageService } from './cart-storage.service';

describe('CartStorageService', () => {
  let service: CartStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartStorageService);
  });

  it('ignores invalid cart entries on load', () => {
    localStorage.setItem(
      'shopping_cart_items_v4',
      JSON.stringify([
        { product: { id: 1, apiId: 'a', originalPrice: 1, originalCurrency: 'USD', commerceId: 'c', presentationUnit: 'unit', name: 'A', extractionSource: '', extractionDate: '', isActive: true }, quantity: 1 },
        { product: null, quantity: 2 },
        { product: { id: 2, apiId: 'b', originalPrice: 2, originalCurrency: 'USD', commerceId: 'c', presentationUnit: 'unit', name: 'B', extractionSource: '', extractionDate: '', isActive: true }, quantity: 0 },
      ]),
    );
    expect(service.load().length).toBe(1);
  });

  it('persists and loads commerce filter id', () => {
    service.saveFilterCommerceId('commerce-1');
    expect(service.loadFilterCommerceId()).toBe('commerce-1');
    service.saveFilterCommerceId(null);
    expect(service.loadFilterCommerceId()).toBeNull();
  });
});
