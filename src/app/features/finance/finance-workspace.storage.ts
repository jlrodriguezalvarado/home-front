const WORKSPACE_KEY = 'home_finance_workspace_v1';

export function readFinanceWorkspaceId(): string | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<{ id: string }>;
    const id = typeof parsed.id === 'string' ? parsed.id.trim() : '';
    if (!id) return null;
    return id;
  } catch {
    return null;
  }
}

export function writeFinanceWorkspaceId(id: string): void {
  const trimmed = id.trim();
  if (!trimmed) return;
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ id: trimmed }));
}

export function clearFinanceWorkspaceId(): void {
  localStorage.removeItem(WORKSPACE_KEY);
}
