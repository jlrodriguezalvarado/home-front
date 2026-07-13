import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RecipeRepository } from '../repositories/recipe.repository';
import { Recipe } from '../models/meal-planning.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { MealPlanningNavComponent } from '../meal-planning-nav.component';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    MealPlanningNavComponent,
  ],
  templateUrl: './recipe-list.component.html',
  styleUrl: './recipe-list.component.scss',
})
export class RecipeListComponent implements OnInit {
  repo = inject(RecipeRepository);
  i18n = inject(I18nService);
  confirm = inject(ConfirmService);
  toast = inject(ToastService);
  recipes = signal<Recipe[]>([]);
  loading = signal(false);
  error = signal(false);
  searchQuery = signal('');
  favoritesOnly = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number | boolean> = {};
    const search = this.searchQuery().trim();
    if (search) params['search'] = search;
    if (this.favoritesOnly()) params['is_favorite'] = true;
    this.repo.list(params).subscribe({
      next: (res) => {
        const items = this.favoritesOnly() ? res.filter((r) => r.isFavorite) : res;
        this.recipes.set(items);
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

  toggleFavoritesFilter() {
    this.favoritesOnly.update((v) => !v);
    this.load();
  }

  toggleFavorite(recipe: Recipe, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.repo.toggleFavorite(recipe.id).subscribe({
      next: (updated) => {
        this.recipes.update((items) => {
          const next = items.map((item) => item.id === updated.id ? updated : item);
          if (this.favoritesOnly()) return next.filter((item) => item.isFavorite);
          return next;
        });
        this.toast.success(updated.isFavorite ? this.i18n.t('markAsFavorite') : this.i18n.t('removeFavorite'));
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Action failed' : 'Acción fallida'),
    });
  }

  async deleteRecipe(recipe: Recipe, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const message =
      this.i18n.lang() === 'en'
        ? `Delete recipe "${recipe.name}"?`
        : `¿Eliminar la receta "${recipe.name}"?`;
    const confirmed = await this.confirm.confirm(message, {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.repo.delete(recipe.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('delete'));
        this.load();
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Delete failed' : 'Error al eliminar'),
    });
  }
}
