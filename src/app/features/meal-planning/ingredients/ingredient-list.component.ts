import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IngredientRepository } from '../repositories/ingredient.repository';
import { Ingredient } from '../models/meal-planning.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { MealPlanningNavComponent } from '../meal-planning-nav.component';
import { IngredientFormDialogComponent } from './ingredient-form-dialog.component';

@Component({
  selector: 'app-ingredient-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    MealPlanningNavComponent,
    IngredientFormDialogComponent,
  ],
  templateUrl: './ingredient-list.component.html',
  styleUrl: './ingredient-list.component.scss',
})
export class IngredientListComponent implements OnInit {
  repo = inject(IngredientRepository);
  i18n = inject(I18nService);
  confirm = inject(ConfirmService);
  toast = inject(ToastService);
  ingredients = signal<Ingredient[]>([]);
  filteredIngredients = signal<Ingredient[]>([]);
  loading = signal(false);
  error = signal(false);
  searchQuery = signal('');
  activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  showDialog = signal(false);
  editingIngredient = signal<Ingredient | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number | boolean> = {};
    const search = this.searchQuery().trim();
    if (search) params['search'] = search;
    this.repo.list(params).subscribe({
      next: (res) => {
        this.ingredients.set(res);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  onSearchChange(value: string) {
    this.searchQuery.set(value);
    this.load();
  }

  onActiveFilterChange(value: 'all' | 'active' | 'inactive') {
    this.activeFilter.set(value);
    this.applyFilter();
  }

  applyFilter() {
    const filter = this.activeFilter();
    let items = this.ingredients();
    if (filter === 'active') items = items.filter((i) => i.isActive);
    if (filter === 'inactive') items = items.filter((i) => !i.isActive);
    this.filteredIngredients.set(items);
  }

  openDialog(ingredient?: Ingredient) {
    this.editingIngredient.set(ingredient ?? null);
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.editingIngredient.set(null);
  }

  onIngredientSaved(saved: Ingredient) {
    this.closeDialog();
    this.ingredients.update((items) => {
      const index = items.findIndex((item) => item.id === saved.id);
      if (index === -1) return [saved, ...items];
      return items.map((item) => (item.id === saved.id ? saved : item));
    });
    this.applyFilter();
  }

  async deleteIngredient(ingredient: Ingredient) {
    const message =
      this.i18n.lang() === 'en'
        ? `Delete ingredient "${ingredient.name}"?`
        : `¿Eliminar el ingrediente "${ingredient.name}"?`;
    const confirmed = await this.confirm.confirm(message, {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.repo.delete(ingredient.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('delete'));
        this.load();
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Delete failed' : 'Error al eliminar'),
    });
  }
}
