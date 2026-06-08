const KG_ALIASES = [
  'kg',
  'kgs',
  'kilo',
  'kilos',
  'kilogram',
  'kilograms',
  'kilogramo',
  'kilogramos',
  'klg',
];

export function normalizePresentationUnit(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return KG_ALIASES.includes(trimmed.toLowerCase()) ? 'kg' : trimmed;
}

export function isPresentationUnitKg(presentationUnit: string): boolean {
  return normalizePresentationUnit(presentationUnit) === 'kg';
}

export function canonicalPresentationUnit(raw: string): 'kg' | 'unit' {
  return isPresentationUnitKg(raw) ? 'kg' : 'unit';
}

export function quantityStep(presentationUnit: string): number {
  return isPresentationUnitKg(presentationUnit) ? 0.1 : 1;
}

export function normalizeQuantityForUnit(quantity: number, presentationUnit: string): number {
  return isPresentationUnitKg(presentationUnit) ? quantity : Math.round(quantity);
}

export const KG_QUANTITY_INPUT_REGEX = /^\d*([.,]\d{0,10})?$/;

export function parseQuantityInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || !KG_QUANTITY_INPUT_REGEX.test(trimmed)) return null;
  const normalized = trimmed.replace(',', '.');
  if (normalized === '.' || normalized.endsWith('.')) return null;
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

export function formatKgQuantityDisplay(quantity: number): string {
  let s = quantity.toFixed(10);
  s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s || '0';
}
