import { decimalDifference, formatDecimalMoney, normalizePriceInput } from './price-comparison.money';

describe('price comparison decimal helpers', () => {
  it('normalizes valid prices without converting through number', () => {
    expect(normalizePriceInput(' 12.5 ')).toBe('12.50');
    expect(normalizePriceInput('0')).toBe('0.00');
    expect(normalizePriceInput('999999999999.99')).toBe('999999999999.99');
  });

  it('rejects values outside the Django decimal contract', () => {
    expect(normalizePriceInput('-1')).toBeNull();
    expect(normalizePriceInput('1.234')).toBeNull();
    expect(normalizePriceInput('1000000000000.00')).toBeNull();
    expect(normalizePriceInput('1e3')).toBeNull();
  });

  it('calculates and formats decimal strings precisely', () => {
    expect(decimalDifference('0.3', '0.1')).toBe('0.2');
    expect(formatDecimalMoney('1234.5', 'en')).toBe('1,234.50');
    expect(formatDecimalMoney('1234.5', 'es')).toBe('1234,50');
    expect(formatDecimalMoney(null, 'es')).toBe('—');
  });
});
