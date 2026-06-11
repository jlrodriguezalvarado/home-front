import { validateFinanceListForm } from './finance-form-rules';

describe('finance-form-rules', () => {
  const base = {
    description: 'Item',
    amount: '10.00',
    notes: '',
    isCash: false,
    isRecurring: false,
    categoryId: '',
    savingsAccountTypeId: '',
    incomeAccountId: '',
  };

  it('requires name and amount for math', () => {
    expect(validateFinanceListForm('math', { ...base, description: '' })).toBe('name_required');
    expect(validateFinanceListForm('math', { ...base, amount: '' })).toBe('amount_required');
    expect(validateFinanceListForm('math', base)).toBeNull();
  });

  it('requires expense_category for initial expenses', () => {
    expect(validateFinanceListForm('initial-expenses', base)).toBe('expense_category_required');
    expect(
      validateFinanceListForm('initial-expenses', { ...base, categoryId: 'cat-1' }),
    ).toBeNull();
  });

  it('requires savings account type for savings', () => {
    expect(validateFinanceListForm('savings', base)).toBe('savings_account_type_required');
    expect(
      validateFinanceListForm('savings', { ...base, savingsAccountTypeId: 'type-1' }),
    ).toBeNull();
  });

  it('requires income account for income', () => {
    expect(validateFinanceListForm('income', { ...base, description: '' })).toBe('income_account_required');
    expect(
      validateFinanceListForm('income', { ...base, description: '', incomeAccountId: 'acc-1' }),
    ).toBeNull();
  });

  it('requires positive amount for income', () => {
    expect(
      validateFinanceListForm('income', { ...base, description: '', amount: '0', incomeAccountId: 'acc-1' }),
    ).toBe('amount_positive');
  });
});
