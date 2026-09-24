import { Component, inject, Input, ChangeDetectionStrategy } from '@angular/core';

import { MenuMeal, Recipe, RecipeIngredient } from '../models/meal-planning.models';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-meal-recipe-display',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './meal-recipe-display.component.html',
})
export class MealRecipeDisplayComponent {
  @Input({ required: true }) meal!: MenuMeal;
  i18n = inject(I18nService);

  mealTitle(): string {
    if (this.meal.recipe?.name) return this.meal.recipe.name;
    if (this.meal.name) return this.meal.name;
    if (this.meal.notes) return this.meal.notes;
    return '—';
  }

  mealSubtitle(): string | null {
    if (this.meal.recipe && this.meal.name && this.meal.name !== this.meal.recipe.name)
      return this.meal.name;
    return null;
  }

  recipeLink(recipe: Recipe): string | null {
    const link = String(recipe.link ?? '').trim();
    return link ? link : null;
  }

  sortedIngredients(recipe: Recipe): RecipeIngredient[] {
    return [...recipe.ingredients].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  ingredientLine(row: RecipeIngredient): string {
    return [row.quantity, row.unit, row.ingredient.name].filter(Boolean).join(' ');
  }
}
