import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { FinanceRepository } from '../finance.repository';
import { MonthlyIncomeEntry, MonthlyIncomeEntryWrite } from '../models/finance.models';
import { decodeApiList, foreignKeyId } from './finance-api.utils';

export interface IncomeEntryListOptions {
  financialMonthId?: string;
  incomeAccountId?: string;
  ordering?: string;
  perPage?: number;
}

@Injectable({
  providedIn: 'root',
})
export class IncomeEntryService {
  private readonly api = inject(ApiService);
  private readonly financeRepo = inject(FinanceRepository);

  list(options: IncomeEntryListOptions = {}): Observable<MonthlyIncomeEntry[]> {
    const params: Record<string, string | number> = {
      ordering: options.ordering ?? '-created_at',
      perPage: options.perPage ?? 200,
    };
    if (options.financialMonthId) params['financial_month'] = options.financialMonthId;
    if (options.incomeAccountId) params['income_account'] = options.incomeAccountId;
    return this.api
      .get<unknown>(API_ENDPOINTS.finance.resources.income, { params })
      .pipe(map((res) => decodeApiList<Record<string, unknown>>(res).map((item) => this.mapEntry(item))));
  }

  listByYearMonth(year: string, month: string): Observable<MonthlyIncomeEntry[]> {
    return this.financeRepo.resolveFinancialMonth(year, month).pipe(
      switchMap((financialMonthId) => {
        if (!financialMonthId) return throwError(() => new Error('Financial month not found'));
        return this.list({ financialMonthId });
      }),
    );
  }

  getById(id: string): Observable<MonthlyIncomeEntry> {
    return this.api
      .get<Record<string, unknown>>(`${API_ENDPOINTS.finance.resources.income}${id}/`)
      .pipe(map((res) => this.mapEntry(res)));
  }

  create(data: MonthlyIncomeEntryWrite): Observable<MonthlyIncomeEntry> {
    return this.api
      .post<Record<string, unknown>>(API_ENDPOINTS.finance.resources.income, this.toPayload(data))
      .pipe(map((res) => this.mapEntry(res)));
  }

  createForYearMonth(
    year: string,
    month: string,
    data: Omit<MonthlyIncomeEntryWrite, 'financialMonthId'>,
  ): Observable<MonthlyIncomeEntry> {
    return this.financeRepo.resolveFinancialMonth(year, month).pipe(
      switchMap((financialMonthId) => {
        if (!financialMonthId) return throwError(() => new Error('Financial month not found'));
        return this.create({ ...data, financialMonthId });
      }),
    );
  }

  update(id: string, data: Partial<MonthlyIncomeEntryWrite>): Observable<MonthlyIncomeEntry> {
    return this.api
      .patch<Record<string, unknown>>(`${API_ENDPOINTS.finance.resources.income}${id}/`, this.toPayload(data))
      .pipe(map((res) => this.mapEntry(res)));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`${API_ENDPOINTS.finance.resources.income}${id}/`);
  }

  private mapEntry(raw: Record<string, unknown>): MonthlyIncomeEntry {
    return {
      id: String(raw['id'] ?? ''),
      financialMonthId: foreignKeyId(raw['financial_month'] ?? raw['month']),
      incomeAccountId: foreignKeyId(raw['income_account']),
      amount: String(raw['amount'] ?? ''),
      notes: raw['notes'] ? String(raw['notes']) : undefined,
      createdAt: raw['created_at'] ? String(raw['created_at']) : undefined,
      updatedAt: raw['updated_at'] ? String(raw['updated_at']) : undefined,
    };
  }

  private toPayload(data: Partial<MonthlyIncomeEntryWrite>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    if (data.financialMonthId) payload['financial_month'] = data.financialMonthId;
    if (data.incomeAccountId) payload['income_account'] = data.incomeAccountId;
    if (data.amount != null) payload['amount'] = data.amount;
    if (data.notes != null && data.notes.trim() !== '') payload['notes'] = data.notes.trim();
    return payload;
  }
}
