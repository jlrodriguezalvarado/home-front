import {
  financeDefaultRoute,
  readFinancePeriod,
  writeFinancePeriod,
} from './finance-period.storage';

describe('finance-period.storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist and read finance period', () => {
    writeFinancePeriod(2026, 7);
    expect(readFinancePeriod()).toEqual({ year: 2026, month: 7 });
  });

  it('should use stored period for default route', () => {
    writeFinancePeriod(2025, 3);
    expect(financeDefaultRoute()).toBe('2025/3');
  });

  it('should ignore invalid stored period', () => {
    localStorage.setItem('home_finance_period_v1', JSON.stringify({ year: 2026, month: 13 }));
    expect(readFinancePeriod()).toBeNull();
  });
});
