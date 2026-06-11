import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap, of, throwError } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS, getFinanceResource } from '../../core/api/endpoints';
import { IncomeAccount, AppCurrency } from './models/finance.models';
import { IncomeAccountService } from './services/income-account.service';
import { SavingsAccountTypeService } from './services/savings-account-type.service';

const FINANCE_PAGE_SIZE = { perPage: '200' };

export interface FinanceSummaryTotal {
  amount: string;
  currency: AppCurrency;
}

export interface FinanceSummary {
  financialMonthId: string;
  month: string;
  year: string;
  totalIncome: string;
  totalExpenses: string;
  balance: string;
  availableNextMonth: string;
  initialMonthExpense: string;
  previousMonthRemainder: string;
  initialMonthRemainder: string;
  nextMonthExpense: string;
  currentGlobalSavings: string;
  previousGlobalSavings: string;
  totalGlobalSavings: string;
  cash: string;
  total: FinanceSummaryTotal;
}

export interface FinanceEntry {
  id: string;
  date: string;
  amount: string;
  description: string;
  categoryName?: string;
  categoryId?: string;
  savingsAccountTypeId?: string;
  savingsAccountTypeName?: string;
  incomeAccountId?: string;
  incomeAccountName?: string;
  isCash?: boolean;
  isRecurring?: boolean;
  isSpent?: boolean;
  color?: string | null;
  notes?: string;
}

export interface RecurringExpenseReplicateItem {
  expenseType: string;
  id?: string;
  sourceId?: string;
  name: string;
  amount?: string;
  isRecurring?: boolean;
  categoryId?: string;
  reason?: string;
}

export interface RecurringExpenseReplicateResult {
  financialMonthId: string;
  previousMonthId: string;
  created: {
    initialExpenseItems: RecurringExpenseReplicateItem[];
    mathExpenseItems: RecurringExpenseReplicateItem[];
    homeExpenseItems: RecurringExpenseReplicateItem[];
  };
  skipped: {
    initialExpenseItems: RecurringExpenseReplicateItem[];
    mathExpenseItems: RecurringExpenseReplicateItem[];
    homeExpenseItems: RecurringExpenseReplicateItem[];
  };
  createdCount: number;
  skippedCount: number;
}

export interface FinanceExchangeHistoryItem {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  amount: string;
  appliedRate: string;
  convertedAmount: string;
  transactionDate?: string;
  notes?: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface FinanceDeclaration {
  id: string;
  title: string;
  content: string;
  amount?: string;
  generalExpenseCategoryId?: string;
  generalExpenseCategoryName?: string;
  notes?: string;
}

export interface FinancialYear {
  id: string;
  year: number;
}

interface FinancialMonthRef {
  id: string;
  month_number?: number;
}

@Injectable({
  providedIn: 'root',
})
export class FinanceRepository {
  private readonly api = inject(ApiService);
  private readonly incomeAccountService = inject(IncomeAccountService);
  private readonly savingsAccountTypeService = inject(SavingsAccountTypeService);

  getMonthlySummary(year: string, month: string, options?: { currency?: string }): Observable<FinanceSummary> {
    const params: Record<string, string> = { year, month };
    if (options?.currency) params['currency'] = options.currency;
    return this.api
      .get<Record<string, unknown>>(API_ENDPOINTS.finance.monthSummary, {
        params,
      })
      .pipe(map((res) => this.mapSummary(res, year, month)));
  }

  listFinancialYears(): Observable<FinancialYear[]> {
    return this.api
      .get<FinancialYear[] | { results: FinancialYear[] }>(API_ENDPOINTS.finance.years, {
        params: FINANCE_PAGE_SIZE,
      })
      .pipe(
        map((res) =>
          this.decodeList<Record<string, unknown>>(res).map((item) => ({
            id: String(item['id'] ?? ''),
            year: Number(item['year']),
          })),
        ),
      );
  }

  getMonthsForYear(calendarYear: number): Observable<number[]> {
    return this.listFinancialYears().pipe(
      switchMap((years) => {
        const match = years.find((y) => y.year === calendarYear);
        if (!match) return of([]);
        return this.api
          .get<FinancialMonthRef[] | { results: FinancialMonthRef[] }>(API_ENDPOINTS.finance.months, {
            params: { financial_year: match.id, ...FINANCE_PAGE_SIZE },
          })
          .pipe(
            map((res) => {
              const items = this.decodeList(res);
              return items
                .map((m) => Number(m['month_number']))
                .filter((n) => Number.isFinite(n))
                .sort((a, b) => a - b);
            }),
          );
      }),
    );
  }

  listEntries(feature: string, year: string, month: string): Observable<FinanceEntry[]> {
    const resource = getFinanceResource(feature);
    if (!resource) return of([]);

    return this.resolveFinancialMonth(year, month).pipe(
      switchMap((financialMonthId) => {
        if (!financialMonthId) return of([]);
        return this.api
          .get<unknown>(resource, {
            params: { financial_month: financialMonthId, ...FINANCE_PAGE_SIZE },
          })
          .pipe(map((res) => this.decodeList(res).map((item) => this.mapEntry(item))));
      }),
    );
  }

  listExchangeHistory(year: string, month: string): Observable<FinanceExchangeHistoryItem[]> {
    return this.resolveFinancialMonth(year, month).pipe(
      switchMap((financialMonthId) => {
        if (!financialMonthId) return of([]);
        return this.api
          .get<unknown>(API_ENDPOINTS.finance.exchangeHistory, {
            params: {
              financial_month: financialMonthId,
              ordering: '-transaction_date',
              ...FINANCE_PAGE_SIZE,
            },
          })
          .pipe(
            map((res) => this.decodeList(res).map((item) => this.mapExchangeHistoryItem(item))),
          );
      }),
    );
  }

  listDeclarations(year: string, month: string): Observable<FinanceDeclaration[]> {
    return this.resolveFinancialMonth(year, month).pipe(
      switchMap((financialMonthId) => {
        if (!financialMonthId) return of([]);
        return this.api
          .get<unknown>(API_ENDPOINTS.finance.declaration, {
            params: { financial_month: financialMonthId, ...FINANCE_PAGE_SIZE },
          })
          .pipe(map((res) => this.decodeList(res).map((item) => this.mapDeclaration(item))));
      }),
    );
  }

  createDeclaration(year: string, month: string, data: Record<string, unknown>): Observable<FinanceDeclaration> {
    return this.resolveFinancialMonth(year, month).pipe(
      switchMap((financialMonthId) => {
        if (!financialMonthId) return throwError(() => new Error('Financial month not found'));
        const payload = this.toDeclarationPayload(data, financialMonthId);
        return this.api
          .post<Record<string, unknown>>(API_ENDPOINTS.finance.declaration, payload)
          .pipe(map((res) => this.mapDeclaration(res)));
      }),
    );
  }

  updateDeclaration(id: string, data: Record<string, unknown>): Observable<FinanceDeclaration> {
    const payload = this.toDeclarationPayload(data);
    return this.api
      .patch<Record<string, unknown>>(`${API_ENDPOINTS.finance.declaration}${id}/`, payload)
      .pipe(map((res) => this.mapDeclaration(res)));
  }

  listInitialExpenseCategories(): Observable<FinanceCategory[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.finance.initialExpenseCategories, { params: FINANCE_PAGE_SIZE })
      .pipe(map((res) => this.decodeList(res).map((item) => this.mapCategory(item))));
  }

  createInitialExpenseCategory(name: string): Observable<FinanceCategory> {
    return this.api
      .post<Record<string, unknown>>(API_ENDPOINTS.finance.initialExpenseCategories, { name })
      .pipe(map((res) => this.mapCategory(res)));
  }

  updateInitialExpenseCategory(id: string, name: string): Observable<FinanceCategory> {
    return this.api
      .patch<Record<string, unknown>>(`${API_ENDPOINTS.finance.initialExpenseCategories}${id}/`, { name })
      .pipe(map((res) => this.mapCategory(res)));
  }

  deleteInitialExpenseCategory(id: string): Observable<void> {
    return this.api.delete<void>(`${API_ENDPOINTS.finance.initialExpenseCategories}${id}/`);
  }

  listGeneralExpenseCategories(): Observable<FinanceCategory[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.finance.generalExpenseCategories, { params: FINANCE_PAGE_SIZE })
      .pipe(map((res) => this.decodeList(res).map((item) => this.mapCategory(item))));
  }

  listSavingsAccountTypes(): Observable<FinanceCategory[]> {
    return this.savingsAccountTypeService.list({ isActive: true }).pipe(
      map((types) => types.map((type) => ({ id: type.id, name: type.name }))),
    );
  }

  listIncomeAccounts(): Observable<FinanceCategory[]> {
    return this.incomeAccountService.list({ isActive: true, ordering: 'name' }).pipe(
      map((accounts) => accounts.map((account) => this.mapIncomeAccountOption(account))),
    );
  }

  confirmExchangeCalculator(data: {
    sourceCurrency: string;
    targetCurrency: string;
    amount: string;
    displayMode?: string;
    notes?: string;
  }): Observable<void> {
    return this.api.post<void>(API_ENDPOINTS.finance.exchangeCalculatorConfirm, {
      source_currency: data.sourceCurrency,
      target_currency: data.targetCurrency,
      amount: data.amount,
      display_mode: data.displayMode ?? 'compact',
      ...(data.notes ? { notes: data.notes } : {}),
    });
  }

  createEntry(feature: string, year: string, month: string, data: Record<string, unknown>): Observable<FinanceEntry> {
    const resource = getFinanceResource(feature);
    if (!resource) return throwError(() => new Error(`Unknown finance feature: ${feature}`));

    return this.resolveFinancialMonth(year, month).pipe(
      switchMap((financialMonthId) => {
        if (!financialMonthId) {
          return throwError(() => new Error('Financial month not found'));
        }
        const payload = this.toWritePayload(feature, data, financialMonthId);
        return this.api.post<Record<string, unknown>>(resource, payload).pipe(
          map((res) => this.mapEntry(res)),
        );
      }),
    );
  }

  updateEntry(feature: string, id: string, data: Record<string, unknown>): Observable<FinanceEntry> {
    const resource = getFinanceResource(feature);
    if (!resource) return throwError(() => new Error(`Unknown finance feature: ${feature}`));

    const payload = this.toWritePayload(feature, data);
    return this.api.patch<Record<string, unknown>>(`${resource}${id}/`, payload).pipe(
      map((res) => this.mapEntry(res)),
    );
  }

  deleteEntry(feature: string, id: string): Observable<void> {
    const resource = getFinanceResource(feature);
    if (!resource) return throwError(() => new Error(`Unknown finance feature: ${feature}`));
    return this.api.delete<void>(`${resource}${id}/`);
  }

  replicateRecurringExpenses(financialMonthId: string): Observable<RecurringExpenseReplicateResult> {
    return this.api
      .post<Record<string, unknown>>(API_ENDPOINTS.finance.recurringExpensesReplicate, {
        financial_month: financialMonthId,
      })
      .pipe(map((res) => this.mapRecurringReplicateResult(res)));
  }

  resolveFinancialMonth(year: string, month: string): Observable<string | null> {
    const yearNum = Number(year);
    const monthNum = Number(month);
    if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum)) return of(null);

    return this.listFinancialYears().pipe(
      map((items) => items.find((y) => y.year === yearNum) ?? null),
      switchMap((financialYear) => {
        if (!financialYear) return of(null);
        return this.api
          .get<FinancialMonthRef[] | { results: FinancialMonthRef[] }>(API_ENDPOINTS.finance.months, {
            params: {
              financial_year: financialYear.id,
              month_number: String(monthNum),
              ...FINANCE_PAGE_SIZE,
            },
          })
          .pipe(
            map((res) => {
              const items = this.decodeList(res);
              return items[0] ? String(items[0]['id'] ?? '') || null : null;
            }),
          );
      }),
    );
  }

  private decodeList<T extends Record<string, unknown>>(data: unknown): T[] {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)) {
      return (data as { results: T[] }).results;
    }
    return [];
  }

  private mapSummary(res: Record<string, unknown>, year: string, month: string): FinanceSummary {
    const summary = (res['summary'] as Record<string, unknown> | undefined) ?? res;
    return {
      financialMonthId: String(res['financial_month_id'] ?? res['id'] ?? ''),
      month: String(res['month'] ?? month),
      year: String(res['year'] ?? year),
      totalIncome: String(summary['month_income'] ?? '0'),
      totalExpenses: String(summary['month_expense'] ?? '0'),
      balance: String(summary['available'] ?? '0'),
      availableNextMonth: String(summary['available_next_month'] ?? '0'),
      initialMonthExpense: String(summary['initial_month_expense'] ?? '0'),
      previousMonthRemainder: String(summary['previous_month_remainder'] ?? '0'),
      initialMonthRemainder: String(summary['initial_month_remainder'] ?? '0'),
      nextMonthExpense: String(summary['next_month_expense'] ?? '0'),
      currentGlobalSavings: String(summary['current_global_savings'] ?? '0'),
      previousGlobalSavings: String(summary['previous_global_savings'] ?? '0'),
      totalGlobalSavings: String(summary['total_global_savings'] ?? '0'),
      cash: String(summary['cash'] ?? '0'),
      total: this.mapSummaryTotal(summary['total']),
    };
  }

  private mapSummaryTotal(raw: unknown): FinanceSummaryTotal {
    const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const currencyRaw = (obj['currency'] && typeof obj['currency'] === 'object' ? obj['currency'] : {}) as Record<string, unknown>;
    return {
      amount: String(obj['amount'] ?? '0'),
      currency: {
        id: String(currencyRaw['id'] ?? ''),
        code: String(currencyRaw['code'] ?? 'USD'),
        name: String(currencyRaw['name'] ?? ''),
        symbol: String(currencyRaw['symbol'] ?? '$'),
        isActive: currencyRaw['is_active'] !== false && currencyRaw['active'] !== false,
      },
    };
  }

  private mapEntry(res: Record<string, unknown>): FinanceEntry {
    const createdAt = res['created_at'] ? String(res['created_at']).split('T')[0] : '';
    const savingsType = res['savings_account_type'];
    const incomeAccount = res['income_account'];
    const categoryRef = res['category'] ?? res['expense_category'] ?? res['category_id'];
    return {
      id: String(res['id'] ?? ''),
      date: String(res['date'] ?? createdAt),
      amount: String(res['amount'] ?? ''),
      description: String(res['name'] ?? res['title'] ?? res['description'] ?? res['notes'] ?? ''),
      categoryName:
        typeof categoryRef === 'object' && categoryRef !== null
          ? String((categoryRef as Record<string, unknown>)['name'] ?? '')
          : res['category_name']
            ? String(res['category_name'])
            : res['expense_category_name']
              ? String(res['expense_category_name'])
              : undefined,
      categoryId: this.foreignKeyId(categoryRef),
      savingsAccountTypeId: this.foreignKeyId(savingsType),
      savingsAccountTypeName:
        typeof savingsType === 'object' && savingsType !== null
          ? String((savingsType as Record<string, unknown>)['name'] ?? '')
          : undefined,
      incomeAccountId: this.foreignKeyId(incomeAccount),
      incomeAccountName:
        typeof incomeAccount === 'object' && incomeAccount !== null
          ? String((incomeAccount as Record<string, unknown>)['name'] ?? '')
          : undefined,
      isCash: res['is_cash'] === true,
      isRecurring: res['is_recurring'] === true,
      isSpent: res['is_spent'] === true,
      color: res['color'] != null ? String(res['color']) : null,
      notes: res['notes'] ? String(res['notes']) : undefined,
    };
  }

  private mapExchangeHistoryItem(res: Record<string, unknown>): FinanceExchangeHistoryItem {
    return {
      id: String(res['id'] ?? ''),
      sourceCurrency: String(res['source_currency'] ?? res['from_currency'] ?? ''),
      targetCurrency: String(res['target_currency'] ?? res['to_currency'] ?? ''),
      amount: String(res['amount'] ?? ''),
      appliedRate: String(res['applied_rate'] ?? res['rate'] ?? res['exchange_rate'] ?? ''),
      convertedAmount: String(res['converted_amount'] ?? ''),
      transactionDate: res['transaction_date'] ? String(res['transaction_date']) : undefined,
      notes: res['notes'] ? String(res['notes']) : undefined,
    };
  }

  private mapDeclaration(res: Record<string, unknown>): FinanceDeclaration {
    const category = res['general_expense_category'];
    return {
      id: String(res['id'] ?? ''),
      title: String(res['title'] ?? res['name'] ?? 'Declaration'),
      content: String(res['content'] ?? ''),
      amount: res['amount'] != null ? String(res['amount']) : undefined,
      generalExpenseCategoryId: this.foreignKeyId(category),
      generalExpenseCategoryName:
        typeof category === 'object' && category !== null
          ? String((category as Record<string, unknown>)['name'] ?? '')
          : undefined,
      notes: res['notes'] ? String(res['notes']) : undefined,
    };
  }

  private mapCategory(res: Record<string, unknown>): FinanceCategory {
    return {
      id: String(res['id'] ?? ''),
      name: String(res['name'] ?? ''),
      sortOrder: res['sort_order'] != null ? Number(res['sort_order']) : undefined,
    };
  }

  private mapIncomeAccountOption(account: IncomeAccount): FinanceCategory {
    return {
      id: account.id,
      name: account.name,
    };
  }

  private foreignKeyId(value: unknown): string | undefined {
    if (value == null || value === '') return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'id' in value) {
      return String((value as Record<string, unknown>)['id']);
    }
    return String(value);
  }

  private toDeclarationPayload(data: Record<string, unknown>, financialMonthId?: string): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      title: String(data['title'] ?? 'Declaration'),
      content: String(data['content'] ?? ''),
    };
    if (financialMonthId) payload['financial_month'] = financialMonthId;
    if (data['amount']) payload['amount'] = data['amount'];
    if (data['generalExpenseCategoryId']) {
      payload['general_expense_category'] = data['generalExpenseCategoryId'];
    }
    if (data['notes']) payload['notes'] = data['notes'];
    return payload;
  }

  private toWritePayload(
    feature: string,
    data: Record<string, unknown>,
    financialMonthId?: string,
  ): Record<string, unknown> {
    const description = String(data['description'] ?? data['name'] ?? '').trim();
    const amount = data['amount'];

    if (feature === 'income') {
      const payload: Record<string, unknown> = {
        amount,
        income_account: data['income_account'] ?? data['incomeAccountId'],
      };
      if (financialMonthId) payload['financial_month'] = financialMonthId;
      const notes = String(data['notes'] ?? description).trim();
      if (notes) payload['notes'] = notes;
      return payload;
    }

    const payload: Record<string, unknown> = {
      name: description,
      amount,
      is_cash: data['isCash'] === true || data['is_cash'] === true,
    };
    if (financialMonthId) payload['financial_month'] = financialMonthId;
    if (feature === 'initial-expenses' && (data['categoryId'] ?? data['category_id'])) {
      payload['category'] = data['categoryId'] ?? data['category_id'];
    }
    if (feature === 'savings' && (data['savingsAccountTypeId'] ?? data['savings_account_type'])) {
      payload['savings_account_type'] = data['savingsAccountTypeId'] ?? data['savings_account_type'];
    }
    if (feature === 'savings' && data['notes'] != null) {
      payload['notes'] = String(data['notes']).trim();
    }
    if (this.isExpenseFeature(feature)) {
      payload['is_recurring'] = data['isRecurring'] === true || data['is_recurring'] === true;
    }
    return payload;
  }

  private isExpenseFeature(feature: string): boolean {
    return feature === 'initial-expenses' || feature === 'math' || feature === 'home';
  }

  private mapRecurringReplicateItem(res: Record<string, unknown>): RecurringExpenseReplicateItem {
    return {
      expenseType: String(res['expense_type'] ?? ''),
      id: res['id'] != null ? String(res['id']) : undefined,
      sourceId: res['source_id'] != null ? String(res['source_id']) : undefined,
      name: String(res['name'] ?? ''),
      amount: res['amount'] != null ? String(res['amount']) : undefined,
      isRecurring: res['is_recurring'] === true,
      categoryId: res['category_id'] != null ? String(res['category_id']) : undefined,
      reason: res['reason'] != null ? String(res['reason']) : undefined,
    };
  }

  private mapRecurringReplicateGroup(res: unknown): {
    initialExpenseItems: RecurringExpenseReplicateItem[];
    mathExpenseItems: RecurringExpenseReplicateItem[];
    homeExpenseItems: RecurringExpenseReplicateItem[];
  } {
    const group = (res as Record<string, unknown>) ?? {};
    return {
      initialExpenseItems: this.decodeList(group['initial_expense_items']).map((item) =>
        this.mapRecurringReplicateItem(item),
      ),
      mathExpenseItems: this.decodeList(group['math_expense_items']).map((item) =>
        this.mapRecurringReplicateItem(item),
      ),
      homeExpenseItems: this.decodeList(group['home_expense_items']).map((item) =>
        this.mapRecurringReplicateItem(item),
      ),
    };
  }

  private mapRecurringReplicateResult(res: Record<string, unknown>): RecurringExpenseReplicateResult {
    return {
      financialMonthId: String(res['financial_month_id'] ?? ''),
      previousMonthId: String(res['previous_month_id'] ?? ''),
      created: this.mapRecurringReplicateGroup(res['created']),
      skipped: this.mapRecurringReplicateGroup(res['skipped']),
      createdCount: Number(res['created_count'] ?? 0),
      skippedCount: Number(res['skipped_count'] ?? 0),
    };
  }
}
