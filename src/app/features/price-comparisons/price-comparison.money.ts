import Decimal from 'decimal.js';

const PRICE_PATTERN = /^\d{1,12}(?:\.\d{1,2})?$/;

export function normalizePriceInput(value: string): string | null {
  const trimmed = value.trim();
  if (!PRICE_PATTERN.test(trimmed)) return null;
  const decimal = new Decimal(trimmed);
  if (!decimal.isFinite() || decimal.isNegative()) return null;
  return decimal.toFixed(2);
}

export function decimalText(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  try {
    const decimal = new Decimal(raw);
    return decimal.isFinite() ? raw : null;
  } catch {
    return null;
  }
}

export function decimalDifference(maximum: string, minimum: string): string {
  return new Decimal(maximum).minus(new Decimal(minimum)).toString();
}

export function compareNullableDecimals(left: string | null, right: string | null): number {
  if (left === null) return right === null ? 0 : 1;
  if (right === null) return -1;
  return new Decimal(left).comparedTo(new Decimal(right));
}

export function formatDecimalMoney(value: string | null, locale: string): string {
  if (value === null) return '—';
  const [integer, fraction] = new Decimal(value).toFixed(2).split('.');
  const formatter = new Intl.NumberFormat(locale);
  const parts = formatter.formatToParts(10000.1);
  const group = parts.find((part) => part.type === 'group')?.value ?? ',';
  const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
  const groupsFourDigits = formatter.formatToParts(1000).some((part) => part.type === 'group');
  const shouldGroup = integer.replace('-', '').length >= (groupsFourDigits ? 4 : 5);
  const grouped = shouldGroup ? integer.replace(/\B(?=(\d{3})+(?!\d))/g, group) : integer;
  return `${grouped}${decimal}${fraction}`;
}
