import {
  clearFinanceWorkspaceId,
  readFinanceWorkspaceId,
  writeFinanceWorkspaceId,
} from './finance-workspace.storage';

describe('finance-workspace.storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist and read finance workspace id', () => {
    writeFinanceWorkspaceId('ws-1');
    expect(readFinanceWorkspaceId()).toBe('ws-1');
  });

  it('should ignore invalid stored workspace id', () => {
    localStorage.setItem('home_finance_workspace_v1', JSON.stringify({ id: '  ' }));
    expect(readFinanceWorkspaceId()).toBeNull();
  });

  it('should clear stored workspace id', () => {
    writeFinanceWorkspaceId('ws-1');
    clearFinanceWorkspaceId();
    expect(readFinanceWorkspaceId()).toBeNull();
  });
});
