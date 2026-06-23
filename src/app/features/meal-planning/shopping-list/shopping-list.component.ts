import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WeeklyMenuRepository } from '../repositories/weekly-menu.repository';
import { ShoppingList, ShoppingListItem } from '../models/meal-planning.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';

interface CommerceGroup {
  commerceName: string;
  items: ShoppingListItem[];
}

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  templateUrl: './shopping-list.component.html',
  styleUrl: './shopping-list.component.scss',
})
export class ShoppingListComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  repo = inject(WeeklyMenuRepository);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  shoppingList = signal<ShoppingList | null>(null);
  loading = signal(false);
  error = signal(false);
  groupedItems = computed(() => this.groupByCommerce(this.shoppingList()?.items ?? []));

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set(true);
      return;
    }
    this.load(id);
  }

  load(id: string) {
    this.loading.set(true);
    this.error.set(false);
    this.repo.shoppingList(id).subscribe({
      next: (list) => {
        this.shoppingList.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  groupByCommerce(items: ShoppingListItem[]): CommerceGroup[] {
    const map = new Map<string, ShoppingListItem[]>();
    for (const item of items) {
      const key = item.commerce?.name ?? (this.i18n.lang() === 'en' ? 'No store' : 'Sin tienda');
      const group = map.get(key) ?? [];
      group.push(item);
      map.set(key, group);
    }
    return Array.from(map.entries()).map(([commerceName, groupItems]) => ({
      commerceName,
      items: groupItems,
    }));
  }

  printList() {
    window.print();
  }

  async copyToClipboard() {
    const list = this.shoppingList();
    if (!list) return;
    const lines: string[] = [list.weeklyMenuName, ''];
    for (const group of this.groupedItems()) {
      lines.push(group.commerceName);
      for (const item of group.items) {
        lines.push(`- ${item.productName}: ${item.totalQuantity} ${item.unit}`);
      }
      lines.push('');
    }
    if (list.withoutProduct.length) {
      lines.push(this.i18n.t('withoutProduct'));
      for (const item of list.withoutProduct) {
        lines.push(`- ${item.ingredientName}: ${item.totalQuantity} ${item.unit}`);
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      this.toast.success(this.i18n.t('copyToClipboard'));
    } catch {
      this.toast.error(this.i18n.lang() === 'en' ? 'Copy failed' : 'Error al copiar');
    }
  }

  recipeUsageText(recipes: { recipeName: string; quantity: string }[]): string {
    return recipes.map((r) => `${r.recipeName} (${r.quantity})`).join(', ');
  }
}
