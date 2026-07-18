import { Component, OnInit, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IngredientRepository } from '../repositories/ingredient.repository';
import { Ingredient } from '../models/meal-planning.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { IngredientFormDialogComponent } from './ingredient-form-dialog.component';

@Component({
  selector: 'app-ingredient-manage-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingStateComponent,
    EmptyStateComponent,
    IngredientFormDialogComponent,
  ],
  templateUrl: './ingredient-manage-dialog.component.html',
})
export class IngredientManageDialogComponent implements OnInit {
  private readonly repo = inject(IngredientRepository);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  i18n = inject(I18nService);
  changed = output<Ingredient[]>();
  closed = output<void>();
  ingredients = signal<Ingredient[]>([]);
  filteredIngredients = signal<Ingredient[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  showFormDialog = signal(false);
  editingIngredient = signal<Ingredient | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    const params: Record<string, string | number | boolean> = {};
    const search = this.searchQuery().trim();
    if (search) params['search'] = search;
    this.repo.list(params).subscribe({
      next: (res) => {
        this.ingredients.set(res);
        this.applyFilter();
        this.loading.set(false);
        this.changed.emit(res.filter((i) => i.isActive));
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(this.i18n.lang() === 'en' ? 'Failed to load ingredients' : 'Error al cargar ingredientes');
      },
    });
  }

  onSearchChange(value: string) {
    this.searchQuery.set(value);
    this.load();
  }

  applyFilter() {
    this.filteredIngredients.set(this.ingredients());
  }

  close() {
    this.closed.emit();
  }

  openCreate() {
    this.editingIngredient.set(null);
    this.showFormDialog.set(true);
  }

  openEdit(ingredient: Ingredient) {
    this.editingIngredient.set(ingredient);
    this.showFormDialog.set(true);
  }

  closeFormDialog() {
    this.showFormDialog.set(false);
    this.editingIngredient.set(null);
  }

  onIngredientSaved(saved: Ingredient) {
    this.closeFormDialog();
    this.ingredients.update((items) => {
      const index = items.findIndex((item) => item.id === saved.id);
      if (index === -1) return [saved, ...items];
      return items.map((item) => (item.id === saved.id ? saved : item));
    });
    this.applyFilter();
    this.changed.emit(this.ingredients().filter((i) => i.isActive));
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
        this.ingredients.update((items) => items.filter((item) => item.id !== ingredient.id));
        this.applyFilter();
        this.changed.emit(this.ingredients().filter((i) => i.isActive));
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Delete failed' : 'Error al eliminar'),
    });
  }
}
