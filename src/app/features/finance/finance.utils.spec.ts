import { formatFinanceMoney, sumEntryAmounts } from './finance.utils';

describe('finance.utils', () => {
  it('formats money values', () => {
    expect(formatFinanceMoney('12.5')).toBe('$12.50');
    expect(formatFinanceMoney(null)).toBe('$0.00');
  });

  it('sums entry amounts', () => {
    expect(sumEntryAmounts(['10', '20.5', 'invalid'])).toBe('30.50');
  });
});
