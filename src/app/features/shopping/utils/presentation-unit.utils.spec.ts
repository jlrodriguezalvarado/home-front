import {
  canonicalPresentationUnit,
  formatKgQuantityDisplay,
  isPresentationUnitKg,
  normalizePresentationUnit,
  normalizeQuantityForUnit,
  parseQuantityInput,
} from './presentation-unit.utils';

describe('presentation-unit.utils', () => {
  it('normalizes kg aliases', () => {
    expect(normalizePresentationUnit('Kilogramos')).toBe('kg');
    expect(normalizePresentationUnit('unit')).toBe('unit');
    expect(isPresentationUnitKg('kgs')).toBe(true);
    expect(canonicalPresentationUnit('kilo')).toBe('kg');
    expect(canonicalPresentationUnit('unit')).toBe('unit');
  });

  it('rounds unit quantities and keeps kg decimals', () => {
    expect(normalizeQuantityForUnit(2.7, 'unit')).toBe(3);
    expect(normalizeQuantityForUnit(1.25, 'kg')).toBe(1.25);
  });

  it('parses kg input with comma separator', () => {
    expect(parseQuantityInput('1,5')).toBe(1.5);
    expect(parseQuantityInput('2.')).toBeNull();
  });

  it('formats kg quantity without float artifacts', () => {
    expect(formatKgQuantityDisplay(1.5)).toBe('1.5');
    expect(formatKgQuantityDisplay(2)).toBe('2');
  });
});
