import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import {
  ExpenseSpendBatch,
  ExpenseSpendBatchItem,
  ExpenseSpendGroup,
  ExpenseSpendPendingItem,
  ExpenseSpendPendingResponse,
  ExpenseSpendRegisterPayload,
  ExpenseSpendType,
} from '../models/finance.models';
import { decodeApiList } from './finance-api.utils';

@Injectable({
  providedIn: 'root',
})
export class ExpenseSpendService {
  private readonly api = inject(ApiService);

  getPending(financialMonthId: string): Observable<ExpenseSpendPendingResponse> {
    return this.api
      .get<Record<string, unknown>>(API_ENDPOINTS.finance.expenseSpendPending, {
        params: { financial_month: financialMonthId },
      })
      .pipe(map((res) => this.mapPendingResponse(res)));
  }

  registerBatch(payload: ExpenseSpendRegisterPayload): Observable<ExpenseSpendBatch> {
    return this.api
      .post<Record<string, unknown>>(API_ENDPOINTS.finance.expenseSpendRegister, {
        financial_month: payload.financialMonthId,
        color: payload.color,
        registered_at: payload.registeredAt,
        items: payload.items.map((item) => ({
          expense_type: item.expenseType,
          id: item.id,
        })),
        ...(payload.notes ? { notes: payload.notes } : {}),
      })
      .pipe(map((res) => this.mapBatch(res)));
  }

  getHistory(financialMonthId: string): Observable<ExpenseSpendBatch[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.finance.expenseSpendHistory, {
        params: { financial_month: financialMonthId },
      })
      .pipe(map((res) => decodeApiList<Record<string, unknown>>(res).map((item) => this.mapBatch(item))));
  }

  private mapPendingResponse(res: Record<string, unknown>): ExpenseSpendPendingResponse {
    const groups = Array.isArray(res['groups']) ? res['groups'] : [];
    return {
      financialMonthId: String(res['financial_month_id'] ?? ''),
      groups: groups.map((group) => this.mapGroup(group as Record<string, unknown>)),
    };
  }

  private mapGroup(raw: Record<string, unknown>): ExpenseSpendGroup {
    const items = Array.isArray(raw['items']) ? raw['items'] : [];
    return {
      expenseType: this.parseExpenseType(raw['expense_type']),
      categoryId: raw['category_id'] != null ? String(raw['category_id']) : null,
      categoryName: String(raw['category_name'] ?? ''),
      items: items.map((item) => this.mapPendingItem(item as Record<string, unknown>)),
    };
  }

  private mapPendingItem(raw: Record<string, unknown>): ExpenseSpendPendingItem {
    return {
      expenseType: this.parseExpenseType(raw['expense_type']),
      id: String(raw['id'] ?? ''),
      name: String(raw['name'] ?? ''),
      amount: String(raw['amount'] ?? ''),
      isCash: raw['is_cash'] === true,
      isSpent: raw['is_spent'] === true,
      color: raw['color'] != null ? String(raw['color']) : null,
      categoryId: raw['category_id'] != null ? String(raw['category_id']) : null,
      categoryName: String(raw['category_name'] ?? ''),
    };
  }

  private mapBatch(raw: Record<string, unknown>): ExpenseSpendBatch {
    const items = Array.isArray(raw['items']) ? raw['items'] : [];
    return {
      id: String(raw['id'] ?? ''),
      color: String(raw['color'] ?? ''),
      registeredAt: String(raw['registered_at'] ?? ''),
      totalAmount: String(raw['total_amount'] ?? '0'),
      items: items.map((item) => this.mapBatchItem(item as Record<string, unknown>)),
      notes: raw['notes'] ? String(raw['notes']) : undefined,
    };
  }

  private mapBatchItem(raw: Record<string, unknown>): ExpenseSpendBatchItem {
    return {
      expenseType: this.parseExpenseType(raw['expense_type']),
      id: String(raw['id'] ?? ''),
      name: String(raw['name'] ?? ''),
      amount: String(raw['amount'] ?? ''),
      categoryName: raw['category_name'] ? String(raw['category_name']) : undefined,
    };
  }

  private parseExpenseType(value: unknown): ExpenseSpendType {
    const type = String(value ?? '');
    if (type === 'initial' || type === 'math' || type === 'home' || type === 'savings') return type;
    return 'initial';
  }
}

export function isValidExpenseSpendColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

export function normalizeExpenseSpendColor(color: string): string {
  const trimmed = color.trim();
  if (!trimmed) return '';
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return withHash.toUpperCase();
}

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today if year/month is the current calendar month; otherwise the 1st of that month. */
export function defaultRegisteredAtIsoDate(year: number | string, month: number | string): string {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return todayIsoDate();
  }
  const now = new Date();
  if (y === now.getFullYear() && m === now.getMonth() + 1) {
    return todayIsoDate();
  }
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

export function expenseSpendSelectionKey(expenseType: ExpenseSpendType, id: string): string {
  return `${expenseType}:${id}`;
}
