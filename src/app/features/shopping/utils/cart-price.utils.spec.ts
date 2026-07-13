import { isPriceUpdatedToday } from './cart-price.utils';

describe('isPriceUpdatedToday', () => {
  it('returns true for timestamps on the current local day', () => {
    const now = new Date();
    expect(isPriceUpdatedToday(now.toISOString())).toBeTrue();
  });

  it('returns false for empty or invalid values', () => {
    expect(isPriceUpdatedToday('')).toBeFalse();
    expect(isPriceUpdatedToday(undefined)).toBeFalse();
    expect(isPriceUpdatedToday('invalid')).toBeFalse();
  });

  it('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isPriceUpdatedToday(yesterday.toISOString())).toBeFalse();
  });
});
