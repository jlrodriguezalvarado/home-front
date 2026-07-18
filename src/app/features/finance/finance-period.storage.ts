const PERIOD_KEY = 'home_finance_period_v1';

export interface FinancePeriod {
  year: number;
  month: number;
}

export function readFinancePeriod(): FinancePeriod | null {
  try {
    const raw = localStorage.getItem(PERIOD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FinancePeriod>;
    const year = Number(parsed.year);
    const month = Number(parsed.month);
    if (!Number.isInteger(year) || year < 1970 || year > 2100) return null;
    if (!Number.isInteger(month) || month < 1 || month > 12) return null;
    return { year, month };
  } catch {
    return null;
  }
}

export function writeFinancePeriod(year: number, month: number): void {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return;
  localStorage.setItem(PERIOD_KEY, JSON.stringify({ year, month }));
}

export function financeDefaultRoute(): string {
  const stored = readFinancePeriod();
  if (stored) return `${stored.year}/${stored.month}`;
  const now = new Date();
  return `${now.getFullYear()}/${now.getMonth() + 1}`;
}
