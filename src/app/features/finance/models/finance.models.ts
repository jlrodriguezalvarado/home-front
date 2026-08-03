export type { PaginatedResponse } from '../../../core/api/models';

export interface IncomeAccount {
  id: string;
  name: string;
  currencyId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncomeAccountWrite {
  name: string;
  currencyId: string;
  isActive: boolean;
}

export interface SavingsAccountType {
  id: string;
  name: string;
  currencyId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavingsAccountTypeWrite {
  name: string;
  currencyId: string;
  isActive: boolean;
}

export interface SavingsItem {
  id: string;
  financialMonthId: string;
  savingsAccountTypeId: string;
  name: string;
  amount: string;
  isCash: boolean;
  isSpent: boolean;
  color: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavingsItemWrite {
  financialMonthId: string;
  savingsAccountTypeId: string;
  name: string;
  amount: string;
  isCash: boolean;
  notes?: string;
}

export interface MonthlyIncomeEntry {
  id: string;
  financialMonthId: string;
  incomeAccountId: string;
  amount: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlyIncomeEntryWrite {
  financialMonthId: string;
  incomeAccountId: string;
  amount: string;
  notes?: string;
}

export interface FinancialMonth {
  id: string;
  monthNumber: number;
  financialYearId?: string;
}

export interface AppCurrency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
}

export type ExpenseSpendType = 'initial' | 'math' | 'home' | 'savings';

export interface ExpenseSpendItemRef {
  expenseType: ExpenseSpendType;
  id: string;
}

export interface ExpenseSpendPendingItem {
  expenseType: ExpenseSpendType;
  id: string;
  name: string;
  amount: string;
  isCash: boolean;
  isSpent: boolean;
  color: string | null;
  categoryId: string | null;
  categoryName: string;
}

export interface ExpenseSpendGroup {
  expenseType: ExpenseSpendType;
  categoryId: string | null;
  categoryName: string;
  items: ExpenseSpendPendingItem[];
}

export interface ExpenseSpendPendingResponse {
  financialMonthId: string;
  groups: ExpenseSpendGroup[];
}

export interface ExpenseSpendBatchItem {
  expenseType: ExpenseSpendType;
  id: string;
  name: string;
  amount: string;
  categoryName?: string;
}

export interface ExpenseSpendBatch {
  id: string;
  color: string;
  registeredAt: string;
  totalAmount: string;
  items: ExpenseSpendBatchItem[];
  notes?: string;
}

export interface ExpenseSpendRegisterPayload {
  financialMonthId: string;
  color: string;
  registeredAt: string;
  items: ExpenseSpendItemRef[];
  notes?: string;
}

export interface SavingsWithdrawal {
  id: string;
  financialMonthId: string;
  savingsAccountTypeId: string;
  amount: string;
  notes?: string;
  incomeEntryId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavingsWithdrawalCreatePayload {
  financialMonthId: string;
  savingsAccountTypeId: string;
  incomeAccountId: string;
  amount: string;
  notes?: string;
}

export type GeneratedReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GeneratedReport {
  id: string;
  financialYear: string;
  year: number;
  triggeredFromMonth: number | null;
  file: string | null;
  fileUrl: string;
  status: GeneratedReportStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  generatedBy: string | null;
  includedMonths: number[];
}

export interface FinancialYearOption {
  id: string;
  year: number;
}
