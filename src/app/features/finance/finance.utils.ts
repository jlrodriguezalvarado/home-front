/** Format decimal string amounts for finance display (matches Flutter MoneyText). */
export function formatFinanceMoney(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toFixed(2)}`;
}

export function sumEntryAmounts(amounts: string[]): string {
  const total = amounts.reduce((sum, a) => sum + (Number(a) || 0), 0);
  return total.toFixed(2);
}
