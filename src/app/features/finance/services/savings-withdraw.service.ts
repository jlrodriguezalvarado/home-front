import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { SavingsWithdrawal, SavingsWithdrawalCreatePayload } from '../models/finance.models';
import { decodeApiList } from './finance-api.utils';

@Injectable({
  providedIn: 'root',
})
export class SavingsWithdrawService {
  private readonly api = inject(ApiService);

  list(financialMonthId: string): Observable<SavingsWithdrawal[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.finance.savingsWithdraw, {
        params: { financial_month: financialMonthId, perPage: 200 },
      })
      .pipe(
        map((res) =>
          decodeApiList<Record<string, unknown>>(res).map((item) => this.mapWithdrawal(item)),
        ),
      );
  }

  create(payload: SavingsWithdrawalCreatePayload): Observable<SavingsWithdrawal> {
    return this.api
      .post<Record<string, unknown>>(API_ENDPOINTS.finance.savingsWithdraw, {
        financial_month: payload.financialMonthId,
        savings_account_type: payload.savingsAccountTypeId,
        income_account: payload.incomeAccountId,
        amount: payload.amount,
        ...(payload.notes ? { notes: payload.notes } : {}),
      })
      .pipe(map((res) => this.mapWithdrawal(res)));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`${API_ENDPOINTS.finance.savingsWithdraw}${id}/`);
  }

  private mapWithdrawal(raw: Record<string, unknown>): SavingsWithdrawal {
    return {
      id: String(raw['id'] ?? ''),
      financialMonthId: String(raw['financial_month'] ?? ''),
      savingsAccountTypeId: String(raw['savings_account_type'] ?? ''),
      amount: String(raw['amount'] ?? '0'),
      notes: raw['notes'] ? String(raw['notes']) : undefined,
      incomeEntryId: String(raw['income_entry'] ?? ''),
      createdAt: raw['created_at'] ? String(raw['created_at']) : undefined,
      updatedAt: raw['updated_at'] ? String(raw['updated_at']) : undefined,
    };
  }
}
