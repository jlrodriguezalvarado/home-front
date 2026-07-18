import { CartItem } from '../../../core/models/shopping.models';
import {
  formatCartListLine,
  formatCartListMessage,
  formatCartListQuantityLabel,
} from './cart-list-message.utils';

const item = (qty: number, unit: string, name: string): CartItem => ({
  product: {
    id: 1,
    apiId: 'a',
    name,
    originalPrice: 10,
    originalCurrency: 'VES',
    commerceId: 'c1',
    presentationUnit: unit,
    extractionSource: '',
    extractionDate: '',
    isActive: true,
  },
  quantity: qty,
});

describe('cart-list-message.utils', () => {
  it('formats unit quantities as integers', () => {
    expect(formatCartListQuantityLabel(1, 'unit')).toBe('1');
    expect(formatCartListLine(item(1, 'unit', 'Pan de sandwich'))).toBe(
      '1\tPan de sandwich',
    );
  });

  it('formats sub-kg weights in grams', () => {
    expect(formatCartListQuantityLabel(0.25, 'kg')).toBe('250 gr');
    expect(formatCartListLine(item(0.25, 'kg', 'Queso mozzarella por kg'))).toBe(
      '250 gr\tQueso mozzarella por kg',
    );
  });

  it('formats whole and fractional kg', () => {
    expect(formatCartListQuantityLabel(1, 'kg')).toBe('1 kg');
    expect(formatCartListQuantityLabel(1.6, 'kg')).toBe('1,6 kg');
    expect(formatCartListQuantityLabel(0.6, 'kg')).toBe('600 gr');
  });

  it('builds multi-line message', () => {
    const msg = formatCartListMessage([
      item(1, 'unit', 'Pan de sandwich'),
      item(0.25, 'kg', 'Queso mozzarella por kg'),
      item(1.6, 'kg', 'Lagarto sin hueso por kg'),
    ]);
    expect(msg).toBe(
      '1\tPan de sandwich\n250 gr\tQueso mozzarella por kg\n1,6 kg\tLagarto sin hueso por kg',
    );
  });
});
