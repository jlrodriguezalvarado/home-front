import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';

export interface FinanceSummary {
  month: string;
  year: string;
  totalIncome: string;
  totalExpenses: string;
  balance: string;
  categories: { name: string, total: string }[];
}

export interface FinanceEntry {
  id: string;
  date: string;
  amount: string;
  description: string;
  categoryName?: string;
  categoryId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FinanceRepository {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.API_BASE_URL}finance/`;

  getMonthlySummary(year: string, month: string): Observable<FinanceSummary> {
    return this.http.get<any>(`${this.baseUrl}month-summary/${year}/${month}/`).pipe(
      map(res => ({
        month: res.month,
        year: res.year,
        totalIncome: res.total_income,
        totalExpenses: res.total_expenses,
        balance: res.balance,
        categories: res.categories
      }))
    );
  }

  listEntries(feature: string, year: string, month: string): Observable<FinanceEntry[]> {
    return this.http.get<any[]>(`${this.baseUrl}${feature}/`, {
      params: { year, month }
    }).pipe(
      map(items => items.map(res => this.mapEntry(res)))
    );
  }

  createEntry(feature: string, data: any): Observable<FinanceEntry> {
    return this.http.post<any>(`${this.baseUrl}${feature}/`, this.toSnakeCase(data)).pipe(
      map(res => this.mapEntry(res))
    );
  }

  updateEntry(feature: string, id: string, data: any): Observable<FinanceEntry> {
    return this.http.patch<any>(`${this.baseUrl}${feature}/${id}/`, this.toSnakeCase(data)).pipe(
      map(res => this.mapEntry(res))
    );
  }

  deleteEntry(feature: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${feature}/${id}/`);
  }

  private mapEntry(res: any): FinanceEntry {
    return {
      id: res.id,
      date: res.date,
      amount: res.amount,
      description: res.description,
      categoryName: res.category_name,
      categoryId: res.category_id
    };
  }

  private toSnakeCase(data: any): any {
    const snake: any = {};
    for (const key in data) {
      if (key === 'categoryName') snake['category_name'] = data[key];
      else if (key === 'categoryId') snake['category_id'] = data[key];
      else snake[key] = data[key];
    }
    return snake;
  }
}
