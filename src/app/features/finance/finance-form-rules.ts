/** Validation rules aligned with OpenAPI schemas at /api/schema/ */

export const DECIMAL_AMOUNT_PATTERN = /^-?\d{0,16}(?:\.\d{0,2})?$/;

export interface FinanceListFormData {
  description: string;
  amount: string;
  notes: string;
  isCash: boolean;
  isRecurring: boolean;
  categoryId: string;
  savingsAccountTypeId: string;
  incomeAccountId: string;
}

export type FinanceFormErrorKey =
  | 'amount_required'
  | 'amount_invalid'
  | 'amount_positive'
  | 'name_required'
  | 'expense_category_required'
  | 'savings_account_type_required'
  | 'income_account_required';

export function validateFinanceListForm(
  feature: string,
  form: FinanceListFormData,
): FinanceFormErrorKey | null {
  const amount = String(form.amount ?? '').trim();
  if (!amount) return 'amount_required';
  if (!DECIMAL_AMOUNT_PATTERN.test(amount)) return 'amount_invalid';
  const amountValue = Number(amount);
  if (feature === 'income' && (!Number.isFinite(amountValue) || amountValue <= 0)) {
    return 'amount_positive';
  }

  if (feature === 'income') {
    if (!form.incomeAccountId) return 'income_account_required';
    return null;
  }

  const name = String(form.description ?? '').trim();
  if (!name) return 'name_required';

  if (feature === 'initial-expenses' && !form.categoryId) {
    return 'expense_category_required';
  }
  if (feature === 'savings' && !form.savingsAccountTypeId) {
    return 'savings_account_type_required';
  }

  return null;
}

export function financeFormErrorMessage(key: FinanceFormErrorKey, lang: 'en' | 'es'): string {
  const messages: Record<FinanceFormErrorKey, { en: string; es: string }> = {
    amount_required: { en: 'Amount is required', es: 'El monto es obligatorio' },
    amount_invalid: { en: 'Amount format is invalid', es: 'El formato del monto no es válido' },
    amount_positive: { en: 'Amount must be greater than zero', es: 'El monto debe ser mayor que cero' },
    name_required: { en: 'Name is required', es: 'El nombre es obligatorio' },
    expense_category_required: { en: 'Category is required', es: 'La categoría es obligatoria' },
    savings_account_type_required: {
      en: 'Savings account type is required',
      es: 'El tipo de cuenta de ahorro es obligatorio',
    },
    income_account_required: {
      en: 'Income account is required',
      es: 'La cuenta de ingreso es obligatoria',
    },
  };
  return messages[key][lang];
}

export function isFieldRequired(feature: string, field: string): boolean {
  switch (field) {
    case 'amount':
      return true;
    case 'description':
      return feature !== 'income';
    case 'categoryId':
      return feature === 'initial-expenses';
    case 'savingsAccountTypeId':
      return feature === 'savings';
    case 'incomeAccountId':
      return feature === 'income';
    default:
      return false;
  }
}
