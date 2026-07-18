import { Routes } from '@angular/router';

export const MEAL_PLANNING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'weekly-menus',
    pathMatch: 'full',
  },
  {
    path: 'recipes',
    loadComponent: () => import('./recipes/recipe-list.component').then(m => m.RecipeListComponent),
  },
  {
    path: 'recipes/create',
    loadComponent: () => import('./recipes/recipe-form.component').then(m => m.RecipeFormComponent),
  },
  {
    path: 'recipes/:id/edit',
    loadComponent: () => import('./recipes/recipe-form.component').then(m => m.RecipeFormComponent),
  },
  {
    path: 'ingredients',
    loadComponent: () => import('./ingredients/ingredient-list.component').then(m => m.IngredientListComponent),
  },
  {
    path: 'meal-types',
    loadComponent: () => import('./meal-types/meal-type-list.component').then(m => m.MealTypeListComponent),
  },
  {
    path: 'weekly-menus',
    loadComponent: () => import('./weekly-menus/weekly-menu-list.component').then(m => m.WeeklyMenuListComponent),
  },
  {
    path: 'weekly-menus/create',
    loadComponent: () => import('./weekly-menus/weekly-menu-builder.component').then(m => m.WeeklyMenuBuilderComponent),
  },
  {
    path: 'weekly-menus/:id/edit',
    loadComponent: () => import('./weekly-menus/weekly-menu-builder.component').then(m => m.WeeklyMenuBuilderComponent),
  },
  {
    path: 'weekly-menus/:id/shopping-list',
    loadComponent: () => import('./shopping-list/shopping-list.component').then(m => m.ShoppingListComponent),
  },
];
