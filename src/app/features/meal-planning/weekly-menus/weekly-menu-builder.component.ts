import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { WeeklyMenuRepository } from '../repositories/weekly-menu.repository';
import { MenuDayRepository } from '../repositories/menu-day.repository';
import { MenuMealRepository } from '../repositories/menu-meal.repository';
import { MealTypeRepository } from '../repositories/meal-type.repository';
import { RecipeRepository } from '../repositories/recipe.repository';
import {
  MenuDay,
  MenuMeal,
  MenuMealPayload,
  MealType,
  Recipe,
  WeeklyMenu,
  WeeklyMenuPayload,
} from '../models/meal-planning.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { DialogFormDirective } from '../../../shared/directives/dialog-form.directive';
import { FavoriteDayPickerComponent } from './favorite-day-picker.component';
import { FavoriteMealPickerComponent } from './favorite-meal-picker.component';
import { MealPlanningNavComponent } from '../meal-planning-nav.component';
import { MealRecipeDisplayComponent } from './meal-recipe-display.component';

@Component({
  selector: 'app-weekly-menu-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LoadingStateComponent,
    ErrorStateComponent,
    DialogFormDirective,
    FavoriteDayPickerComponent,
    FavoriteMealPickerComponent,
    MealPlanningNavComponent,
    MealRecipeDisplayComponent,
  ],
  templateUrl: './weekly-menu-builder.component.html',
  styleUrl: './weekly-menu-builder.component.scss',
})
export class WeeklyMenuBuilderComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  menuRepo = inject(WeeklyMenuRepository);
  dayRepo = inject(MenuDayRepository);
  mealRepo = inject(MenuMealRepository);
  mealTypeRepo = inject(MealTypeRepository);
  recipeRepo = inject(RecipeRepository);
  i18n = inject(I18nService);
  confirm = inject(ConfirmService);
  toast = inject(ToastService);
  menu = signal<WeeklyMenu | null>(null);
  mealTypes = signal<MealType[]>([]);
  recipes = signal<Recipe[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal(false);
  isCreateMode = signal(true);
  menuForm = signal<WeeklyMenuPayload>({
    name: '',
    isTemplate: false,
    notes: '',
  });
  showMealDialog = signal(false);
  editingMealId = signal<string | null>(null);
  activeDay = signal<MenuDay | null>(null);
  mealForm = signal<MenuMealPayload>({
    menuDay: '',
    mealType: '',
    recipe: null,
    name: '',
    notes: '',
    sortOrder: 0,
  });
  showFavoriteDayPicker = signal(false);
  favoriteDayTarget = signal<MenuDay | null>(null);
  showFavoriteMealPicker = signal(false);
  favoriteMealTargetDay = signal<MenuDay | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.isCreateMode.set(!id);
    this.loading.set(true);
    forkJoin({
      mealTypes: this.mealTypeRepo.list({ is_active: true }),
      recipes: this.recipeRepo.list({ is_active: true }),
    }).subscribe({
      next: ({ mealTypes, recipes }) => {
        this.mealTypes.set(mealTypes);
        this.recipes.set(recipes);
        if (id) {
          this.loadMenu(id);
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  loadMenu(id: string) {
    this.loading.set(true);
    this.error.set(false);
    this.menuRepo.get(id).subscribe({
      next: (menu) => {
        this.menu.set(menu);
        this.menuForm.set({
          name: menu.name,
          isTemplate: menu.isTemplate,
          notes: menu.notes,
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  updateMenuField<K extends keyof WeeklyMenuPayload>(key: K, value: WeeklyMenuPayload[K]) {
    this.menuForm.update((f) => ({ ...f, [key]: value }));
  }

  saveMenuMeta() {
    const payload = this.menuForm();
    if (!payload.name.trim()) {
      this.toast.error(this.i18n.lang() === 'en' ? 'Name is required' : 'El nombre es obligatorio');
      return;
    }
    this.saving.set(true);
    if (this.isCreateMode()) {
      this.menuRepo.create(payload).subscribe({
        next: (created) => {
          this.saving.set(false);
          this.toast.success(this.i18n.t('save'));
          this.router.navigate(['/meal-planning/weekly-menus', created.id, 'edit']);
        },
        error: () => {
          this.saving.set(false);
          this.toast.error(this.i18n.lang() === 'en' ? 'Save failed' : 'Error al guardar');
        },
      });
    } else {
      const menu = this.menu();
      if (!menu) return;
      this.menuRepo.update(menu.id, payload).subscribe({
        next: (updated) => {
          this.menu.set(updated);
          this.saving.set(false);
          this.toast.success(this.i18n.t('save'));
        },
        error: () => {
          this.saving.set(false);
          this.toast.error(this.i18n.lang() === 'en' ? 'Save failed' : 'Error al guardar');
        },
      });
    }
  }

  setAsCurrent() {
    const menu = this.menu();
    if (!menu || menu.isCurrent) return;
    this.saving.set(true);
    this.menuRepo.setCurrent(menu.id).subscribe({
      next: (updated) => {
        this.menu.set(updated);
        this.saving.set(false);
        this.toast.success(this.i18n.t('markAsCurrent'));
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.i18n.lang() === 'en' ? 'Action failed' : 'Acción fallida');
      },
    });
  }

  openMealDialog(day: MenuDay, meal?: MenuMeal) {
    this.activeDay.set(day);
    if (meal) {
      this.editingMealId.set(meal.id);
      this.mealForm.set({
        menuDay: day.id,
        mealType: meal.mealType.id,
        recipe: meal.recipe?.id ?? null,
        name: meal.name,
        notes: meal.notes,
        sortOrder: meal.sortOrder,
      });
    } else {
      this.editingMealId.set(null);
      this.mealForm.set({
        menuDay: day.id,
        mealType: this.mealTypes()[0]?.id ?? '',
        recipe: null,
        name: '',
        notes: '',
        sortOrder: day.meals.length,
      });
    }
    this.showMealDialog.set(true);
  }

  closeMealDialog() {
    this.showMealDialog.set(false);
  }

  updateMealField<K extends keyof MenuMealPayload>(key: K, value: MenuMealPayload[K]) {
    this.mealForm.update((f) => ({ ...f, [key]: value }));
  }

  isMealFormValid(): boolean {
    const form = this.mealForm();
    if (!form.mealType) return false;
    return !!(form.recipe || form.name.trim() || form.notes.trim());
  }

  saveMeal() {
    if (!this.isMealFormValid()) {
      this.toast.error(this.i18n.lang() === 'en' ? 'Meal type and content are required' : 'Tipo de comida y contenido son obligatorios');
      return;
    }
    const payload = this.mealForm();
    const editingMealId = this.editingMealId();
    const request$ = editingMealId
      ? this.mealRepo.update(editingMealId, payload)
      : this.mealRepo.create(payload);
    request$.subscribe({
      next: () => {
        this.toast.success(this.i18n.t('save'));
        this.closeMealDialog();
        this.reloadMenu();
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Save failed' : 'Error al guardar'),
    });
  }

  async deleteMeal(meal: MenuMeal) {
    const message =
      this.i18n.lang() === 'en'
        ? 'Delete this meal?'
        : '¿Eliminar esta comida?';
    const confirmed = await this.confirm.confirm(message, {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.mealRepo.delete(meal.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('delete'));
        this.reloadMenu();
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Delete failed' : 'Error al eliminar'),
    });
  }

  toggleDayFavorite(day: MenuDay) {
    this.dayRepo.toggleFavorite(day.id).subscribe({
      next: (updated) => {
        this.patchDayFavorite(updated.id, updated.isFavorite);
        this.toast.success(updated.isFavorite ? this.i18n.t('markAsFavorite') : this.i18n.t('removeFavorite'));
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Action failed' : 'Acción fallida'),
    });
  }

  toggleMealFavorite(meal: MenuMeal) {
    this.mealRepo.toggleFavorite(meal.id).subscribe({
      next: (updated) => {
        this.patchMealFavorite(updated.id, updated.isFavorite);
        this.toast.success(updated.isFavorite ? this.i18n.t('markAsFavorite') : this.i18n.t('removeFavorite'));
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Action failed' : 'Acción fallida'),
    });
  }

  private patchDayFavorite(dayId: string, isFavorite: boolean) {
    this.menu.update((menu) => {
      if (!menu) return menu;
      return {
        ...menu,
        days: menu.days.map((day) => day.id === dayId ? { ...day, isFavorite } : day),
      };
    });
  }

  private patchMealFavorite(mealId: string, isFavorite: boolean) {
    this.menu.update((menu) => {
      if (!menu) return menu;
      return {
        ...menu,
        days: menu.days.map((day) => ({
          ...day,
          meals: day.meals.map((meal) => meal.id === mealId ? { ...meal, isFavorite } : meal),
        })),
      };
    });
  }

  openFavoriteDayPicker(day: MenuDay) {
    this.favoriteDayTarget.set(day);
    this.showFavoriteDayPicker.set(true);
  }

  closeFavoriteDayPicker() {
    this.showFavoriteDayPicker.set(false);
    this.favoriteDayTarget.set(null);
  }

  onFavoriteDayCopied() {
    this.closeFavoriteDayPicker();
    this.toast.success(this.i18n.t('copyFavoriteDay'));
    this.reloadMenu();
  }

  openFavoriteMealPicker(day: MenuDay) {
    this.favoriteMealTargetDay.set(day);
    this.showFavoriteMealPicker.set(true);
  }

  closeFavoriteMealPicker() {
    this.showFavoriteMealPicker.set(false);
    this.favoriteMealTargetDay.set(null);
  }

  onFavoriteMealCopied() {
    this.closeFavoriteMealPicker();
    this.toast.success(this.i18n.t('copyFavoriteMeal'));
    this.reloadMenu();
  }

  reloadMenu() {
    const menu = this.menu();
    if (menu) this.loadMenu(menu.id);
  }

  sortedDays(): MenuDay[] {
    return [...(this.menu()?.days ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  sortedDayMeals(day: MenuDay): MenuMeal[] {
    return [...day.meals].sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
