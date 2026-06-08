import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { CartStorageService } from './cart-storage.service';
import { Product } from '../../core/models/shopping.models';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CartService', () => {
  let service: CartService;
  let storage: CartStorageService;

  const kgProduct: Product = {
    id: 101,
    apiId: 'uuid-kg',
    name: 'Rice',
    originalPrice: 10,
    originalCurrency: 'USD',
    commerceId: 'c1',
    presentationUnit: 'kg',
    extractionSource: '',
    extractionDate: '2026-01-01T00:00:00.000Z',
    isActive: true,
  };

  const unitProduct: Product = {
    id: 202,
    apiId: 'uuid-unit',
    name: 'Bread',
    originalPrice: 3,
    originalCurrency: 'USD',
    commerceId: 'c1',
    presentationUnit: 'unit',
    extractionSource: '',
    extractionDate: '2026-01-01T00:00:00.000Z',
    isActive: true,
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    storage = TestBed.inject(CartStorageService);
    service = TestBed.inject(CartService);
    service.hydrate([]);
  });

  it('addProduct increments existing line by 1', () => {
    service.addProduct(unitProduct);
    service.addProduct(unitProduct);
    expect(service.items()[0].quantity).toBe(2);
  });

  it('setQuantity removes line when quantity <= 0', () => {
    service.addProduct(unitProduct);
    service.setQuantity(unitProduct.id, 0);
    expect(service.items().length).toBe(0);
  });

  it('rounds unit quantities on setQuantity', () => {
    service.addProduct(unitProduct);
    service.setQuantity(unitProduct.id, 2.7);
    expect(service.items()[0].quantity).toBe(3);
  });

  it('mergeProductQuantity sums quantities', () => {
    service.addProduct(kgProduct);
    service.mergeProductQuantity(kgProduct, 0.5);
    expect(service.items()[0].quantity).toBe(1.5);
  });

  it('syncProductSnapshot updates product and rounds unit quantity', () => {
    service.mergeProductQuantity(kgProduct, 2.3);
    const updated: Product = { ...kgProduct, originalPrice: 12, presentationUnit: 'unit' };
    service.syncProductSnapshot(updated);
    const item = service.items()[0];
    expect(item.product.originalPrice).toBe(12);
    expect(item.product.presentationUnit).toBe('unit');
    expect(item.quantity).toBe(2);
  });

  it('computes grandTotal and commerceSubtotal', () => {
    service.addProduct(unitProduct);
    service.mergeProductQuantity(kgProduct, 1.5);
    expect(service.grandTotal()).toBe(18);
    expect(service.commerceSubtotal('c1')).toBe(18);
  });

  it('persists cart after mutations', () => {
    service.addProduct(unitProduct);
    const saved = storage.load();
    expect(saved.length).toBe(1);
    expect(saved[0].quantity).toBe(1);
  });

  it('mergeProductQuantity ignores non-positive quantity', () => {
    service.addProduct(unitProduct);
    service.mergeProductQuantity(unitProduct, 0);
    expect(service.items()[0].quantity).toBe(1);
  });

  it('repairs missing commerceId and prefers products-page commerce filter', () => {
    const missingCommerce: Product = { ...unitProduct, commerceId: '' };
    const otherCommerce: Product = { ...kgProduct, id: 303, apiId: 'uuid-other', commerceId: 'c2' };

    localStorage.setItem(
      'products_list_filters_v1',
      JSON.stringify({ commerceId: 'c2', categoryId: null, search: '' }),
    );

    service.addProduct(missingCommerce);
    service.addProduct(otherCommerce);

    expect(service.commerceIds()).toEqual(['c2']);
    expect(service.items().find((i) => i.product.id === unitProduct.id)?.product.commerceId).toBe('');

    service.repairMissingCommerceIds('c2');

    expect(service.commerceIds()).toEqual(['c2']);
    expect(service.items().find((i) => i.product.id === unitProduct.id)?.product.commerceId).toBe('c2');
    expect(service.resolveEffectiveFilterCommerceId()).toBe('c2');
  });
});
