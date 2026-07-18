import { CartItem } from '../../../core/models/shopping.models';
import { isPresentationUnitKg } from './presentation-unit.utils';

const CURRENCY_OBJECT_KEYS = ['code', 'currency_code', 'symbol', 'name'] as const;

/** Normalize API currency fields that may be a string or nested object. */
export function resolveCurrencyCode(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '[object Object]' ? '' : trimmed;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of CURRENCY_OBJECT_KEYS) {
      const candidate = obj[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return '';
}

/** Ensure product currency is always a displayable code string. */
export function normalizeProductCurrency(
  product: { originalCurrency: unknown; commerceId?: string },
  commerceCurrency?: unknown,
): string {
  const direct = resolveCurrencyCode(product.originalCurrency);
  if (direct) return direct;
  return resolveCurrencyCode(commerceCurrency);
}

export function lineTotal(item: CartItem): number {
  return item.product.originalPrice * item.quantity;
}

export function formatPrice(amount: number, currency: unknown = ''): string {
  const c = resolveCurrencyCode(currency);
  const a = amount.toFixed(2);
  return c ? `${a} ${c}` : a;
}

export function formatUnitPrice(product: {
  originalPrice: number;
  originalCurrency: string;
  presentationUnit: string;
}): string {
  const base = formatPrice(product.originalPrice, product.originalCurrency);
  return isPresentationUnitKg(product.presentationUnit) ? `${base} / kg` : base;
}

export function moneyDecimalString(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toFixed(2);
}

export function quantityStringForPurchase(quantity: number, presentationUnit: string): string {
  if (isPresentationUnitKg(presentationUnit)) {
    let s = quantity.toFixed(6);
    s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s || '0';
  }
  if (quantity === Math.round(quantity)) return Math.round(quantity).toString();
  return quantity.toString();
}

export function contributesToTotalQuantityCount(item: CartItem): number {
  return isPresentationUnitKg(item.product.presentationUnit) ? 1 : item.quantity;
}

export function singleAggregateCurrency(items: CartItem[]): string | null {
  const codes = new Set(
    items.map((i) => resolveCurrencyCode(i.product.originalCurrency)).filter(Boolean),
  );
  return codes.size === 1 ? [...codes][0] : null;
}
