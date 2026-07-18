import { CartItem } from '../../../core/models/shopping.models';
import {
  contributesToTotalQuantityCount,
  formatPrice,
  lineTotal,
  moneyDecimalString,
  quantityStringForPurchase,
  resolveCurrencyCode,
  singleAggregateCurrency,
} from './price.utils';

const kgItem = (price: number, qty: number, currency = 'USD'): CartItem => ({
  product: {
    id: 1,
    apiId: 'uuid-1',
    name: 'Apples',
    originalPrice: price,
    originalCurrency: currency,
    commerceId: 'c1',
    presentationUnit: 'kg',
    extractionSource: '',
    extractionDate: '',
    isActive: true,
  },
  quantity: qty,
});

const unitItem = (price: number, qty: number, currency = 'USD'): CartItem => ({
  product: {
    id: 2,
    apiId: 'uuid-2',
    name: 'Milk',
    originalPrice: price,
    originalCurrency: currency,
    commerceId: 'c1',
    presentationUnit: 'unit',
    extractionSource: '',
    extractionDate: '',
    isActive: true,
  },
  quantity: qty,
});

describe('price.utils', () => {
  it('calculates line totals with originalPrice * quantity', () => {
    expect(lineTotal(kgItem(10, 1.5))).toBe(15);
    expect(lineTotal(unitItem(5, 3))).toBe(15);
  });

  it('formats prices and money strings', () => {
    expect(formatPrice(12.3, 'USD')).toBe('12.30 USD');
    expect(moneyDecimalString(12.345)).toBe('12.35');
  });

  it('formats purchase quantities per unit type', () => {
    expect(quantityStringForPurchase(1.5, 'kg')).toBe('1.5');
    expect(quantityStringForPurchase(2, 'unit')).toBe('2');
  });

  it('counts kg items as 1 in visible quantity count', () => {
    expect(contributesToTotalQuantityCount(kgItem(1, 2.5))).toBe(1);
    expect(contributesToTotalQuantityCount(unitItem(1, 3))).toBe(3);
  });

  it('resolves currency from nested API objects', () => {
    expect(resolveCurrencyCode('USD')).toBe('USD');
    expect(resolveCurrencyCode({ code: 'VES', symbol: 'Bs' })).toBe('VES');
    expect(resolveCurrencyCode({ currency_code: 'VES' })).toBe('VES');
    expect(resolveCurrencyCode({ symbol: '$' })).toBe('$');
    expect(resolveCurrencyCode('[object Object]')).toBe('');
    expect(resolveCurrencyCode(null)).toBe('');
    expect(formatPrice(703.1, { code: 'VES' })).toBe('703.10 VES');
  });

  it('returns single currency only when all items match', () => {
    expect(singleAggregateCurrency([kgItem(1, 1), unitItem(1, 1)])).toBe('USD');
    expect(
      singleAggregateCurrency([kgItem(1, 1, 'USD'), unitItem(1, 1, 'EUR')]),
    ).toBeNull();
  });
});
