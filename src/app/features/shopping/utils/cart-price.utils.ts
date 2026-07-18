/** True when the ISO timestamp falls on the current local calendar day. */
export function isPriceUpdatedToday(isoDate: string | null | undefined): boolean {
  if (!isoDate?.trim()) return false;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear()
    && parsed.getMonth() === now.getMonth()
    && parsed.getDate() === now.getDate()
  );
}
