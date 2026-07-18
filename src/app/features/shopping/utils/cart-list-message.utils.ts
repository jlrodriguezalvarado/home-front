import { CartItem } from '../../../core/models/shopping.models';
import { isPresentationUnitKg } from './presentation-unit.utils';

/** Decimal with comma separator for list messages (e.g. 1.6 → "1,6"). */
export function formatDecimalWithComma(value: number): string {
  let s = value.toFixed(10);
  s = s.replace(/0+$/, '').replace(/\.$/, '');
  return (s || '0').replace('.', ',');
}

/**
 * Quantity label for copy/WhatsApp shopping list.
 * Examples: "1", "250 gr", "1 kg", "1,6 kg"
 */
export function formatCartListQuantityLabel(quantity: number, presentationUnit: string): string {
  if (isPresentationUnitKg(presentationUnit)) {
    if (quantity < 1) {
      return `${Math.round(quantity * 1000)} gr`;
    }
    if (quantity === Math.round(quantity)) {
      return `${Math.round(quantity)} kg`;
    }
    return `${formatDecimalWithComma(quantity)} kg`;
  }
  return String(Math.round(quantity));
}

export function formatCartListLine(item: CartItem): string {
  const label = formatCartListQuantityLabel(item.quantity, item.product.presentationUnit);
  return `${label}\t${item.product.name}`;
}

/** Plain shopping list: one line per item, quantity TAB product name. */
export function formatCartListMessage(items: CartItem[]): string {
  return items.map(formatCartListLine).join('\n');
}
