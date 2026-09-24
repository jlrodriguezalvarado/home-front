import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { CartComponent } from './cart.component';
import { CartService } from './cart.service';
import { PurchaseRepository } from './purchase.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { CommerceRepository } from '../commerce/commerce.repository';
import { ProductFilterStorageService } from '../products/product-filter-storage.service';
import { ProductRepository } from '../products/product.repository';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { BasketComparisonRepository } from './basket-comparison/basket-comparison.repository';

describe('CartComponent', () => {
  let fixture: ComponentFixture<CartComponent>;
  let component: CartComponent;

  beforeEach(async () => {
    const emptyItems = signal([]);
    const cartMock = {
      items: emptyItems.asReadonly(),
      itemsByCommerce: signal<Record<string, never>>({}),
      commerceIds: signal<string[]>([]),
      grandTotal: signal(0),
      pricesRefreshing: signal(false),
      visibleQuantityCountFor: () => 0,
      visibleTotal: () => 0,
      visibleTotalCurrency: () => null,
      refreshPricesIfNeeded: () => of(0),
      repairMissingCommerceIds: jasmine.createSpy('repairMissingCommerceIds'),
      resolveEffectiveFilterCommerceId: () => null,
      setFilterCommerceId: jasmine.createSpy('setFilterCommerceId'),
      addProduct: jasmine.createSpy('addProduct'),
      removeProducts: jasmine.createSpy('removeProducts'),
      clearCart: jasmine.createSpy('clearCart'),
    };
    await TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: cartMock },
        { provide: PurchaseRepository, useValue: { createFromCart: () => of({}) } },
        { provide: I18nService, useValue: { t: (k: string) => k, lang: () => 'en' } },
        { provide: CommerceRepository, useValue: { list: () => of([]) } },
        {
          provide: ProductFilterStorageService,
          useValue: {
            load: () => null,
            save: jasmine.createSpy('save'),
          },
        },
        {
          provide: ProductRepository,
          useValue: { list: () => of({ results: [], count: 0 }) },
        },
        {
          provide: ToastService,
          useValue: {
            error: jasmine.createSpy('error'),
            success: jasmine.createSpy('success'),
          },
        },
        { provide: ConfirmService, useValue: { confirm: () => Promise.resolve(true) } },
        {
          provide: BasketComparisonRepository,
          useValue: { create: () => of({}), list: () => of([]) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates with an empty cart', () => {
    expect(component).toBeTruthy();
    expect(component.commerceIds().length).toBe(0);
  });
});
