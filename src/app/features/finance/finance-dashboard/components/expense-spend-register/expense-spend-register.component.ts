import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ExpenseSpendGroup, ExpenseSpendPendingItem } from '../../../models/finance.models';
import {
  ExpenseSpendService,
  expenseSpendSelectionKey,
  isValidExpenseSpendColor,
  normalizeExpenseSpendColor,
  todayIsoDate,
} from '../../../services/expense-spend.service';
import { formatFinanceMoney } from '../../../finance.utils';
import { financeApiErrorMessage } from '../../../services/finance-api.utils';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { ToastService } from '../../../../../shared/services/toast.service';
import { DialogFormDirective } from '../../../../../shared/directives/dialog-form.directive';

@Component({
  selector: 'app-expense-spend-register',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogFormDirective],
  templateUrl: './expense-spend-register.component.html',
})
export class ExpenseSpendRegisterComponent implements OnChanges {
  private readonly expenseSpendService = inject(ExpenseSpendService);
  i18n = inject(I18nService);
  toast = inject(ToastService);

  @Input({ required: true }) financialMonthId = '';
  @Output() closed = new EventEmitter<void>();
  @Output() registered = new EventEmitter<void>();

  groups = signal<ExpenseSpendGroup[]>([]);
  loading = signal(false);
  saving = signal(false);
  collapsedGroups = signal<Set<string>>(new Set());
  selectedKeys = signal<Set<string>>(new Set());
  color = '#FFAA00';
  registeredAt = todayIsoDate();
  notes = '';

  formatMoney = formatFinanceMoney;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['financialMonthId'] && this.financialMonthId) {
      this.loadPending();
    }
  }

  loadPending() {
    if (!this.financialMonthId) return;
    this.loading.set(true);
    this.expenseSpendService.getPending(this.financialMonthId).subscribe({
      next: (res) => {
        this.groups.set(res.groups);
        this.selectedKeys.set(new Set());
        this.loading.set(false);
      },
      error: (err) => {
        this.groups.set([]);
        this.loading.set(false);
        this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
      },
    });
  }

  groupKey(group: ExpenseSpendGroup, index: number): string {
    return `${group.expenseType}:${group.categoryId ?? 'none'}:${index}`;
  }

  isGroupCollapsed(key: string): boolean {
    return this.collapsedGroups().has(key);
  }

  toggleGroup(key: string) {
    this.collapsedGroups.update((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  isSelected(item: ExpenseSpendPendingItem): boolean {
    return this.selectedKeys().has(expenseSpendSelectionKey(item.expenseType, item.id));
  }

  toggleItem(item: ExpenseSpendPendingItem) {
    const key = expenseSpendSelectionKey(item.expenseType, item.id);
    this.selectedKeys.update((set) => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  isGroupFullySelected(group: ExpenseSpendGroup): boolean {
    if (!group.items.length) return false;
    return group.items.every((item) => this.isSelected(item));
  }

  isGroupPartiallySelected(group: ExpenseSpendGroup): boolean {
    const selected = group.items.filter((item) => this.isSelected(item)).length;
    return selected > 0 && selected < group.items.length;
  }

  toggleGroupSelection(group: ExpenseSpendGroup) {
    const allSelected = this.isGroupFullySelected(group);
    this.selectedKeys.update((set) => {
      const next = new Set(set);
      for (const item of group.items) {
        const key = expenseSpendSelectionKey(item.expenseType, item.id);
        if (allSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }

  selectedCount(): number {
    return this.selectedKeys().size;
  }

  canSubmit(): boolean {
    const normalized = normalizeExpenseSpendColor(this.color);
    return (
      this.selectedCount() > 0 &&
      !!this.registeredAt.trim() &&
      isValidExpenseSpendColor(normalized)
    );
  }

  onColorInput(value: string) {
    this.color = normalizeExpenseSpendColor(value);
  }

  close() {
    this.closed.emit();
  }

  submit() {
    const normalizedColor = normalizeExpenseSpendColor(this.color);
    if (this.selectedCount() === 0) {
      this.toast.error(
        this.i18n.lang() === 'en'
          ? 'Select at least one expense'
          : 'Selecciona al menos un gasto',
      );
      return;
    }
    if (!this.registeredAt.trim()) {
      this.toast.error(
        this.i18n.lang() === 'en'
          ? 'Registration date is required'
          : 'La fecha de registro es obligatoria',
      );
      return;
    }
    if (!isValidExpenseSpendColor(normalizedColor)) {
      this.toast.error(
        this.i18n.lang() === 'en'
          ? 'Color must be in #RRGGBB format'
          : 'El color debe tener formato #RRGGBB',
      );
      return;
    }
    const items = this.buildSelectedItems();
    this.saving.set(true);
    this.expenseSpendService
      .registerBatch({
        financialMonthId: this.financialMonthId,
        color: normalizedColor,
        registeredAt: this.registeredAt.trim(),
        items,
        notes: this.notes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success(
            this.i18n.lang() === 'en'
              ? 'Expenses registered'
              : 'Gastos registrados',
          );
          this.registered.emit();
          this.close();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(financeApiErrorMessage(err, this.i18n.lang()));
          if (err instanceof HttpErrorResponse && err.status === 400) {
            this.loadPending();
          }
        },
      });
  }

  private buildSelectedItems() {
    const keys = this.selectedKeys();
    const items: { expenseType: ExpenseSpendPendingItem['expenseType']; id: string }[] = [];
    for (const group of this.groups()) {
      for (const item of group.items) {
        const key = expenseSpendSelectionKey(item.expenseType, item.id);
        if (keys.has(key)) {
          items.push({ expenseType: item.expenseType, id: item.id });
        }
      }
    }
    return items;
  }
}
