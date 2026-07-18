import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { WeeklyMenuRepository } from '../repositories/weekly-menu.repository';
import { MenuDay, MenuMeal, WeeklyMenu } from '../models/meal-planning.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { MealPlanningNavComponent } from '../meal-planning-nav.component';
import { MealRecipeDisplayComponent } from './meal-recipe-display.component';

@Component({
  selector: 'app-weekly-menu-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    MealPlanningNavComponent,
    MealRecipeDisplayComponent,
  ],
  templateUrl: './weekly-menu-list.component.html',
  styleUrl: './weekly-menu-list.component.scss',
})
export class WeeklyMenuListComponent implements OnInit {
  repo = inject(WeeklyMenuRepository);
  router = inject(Router);
  i18n = inject(I18nService);
  confirm = inject(ConfirmService);
  toast = inject(ToastService);
  menus = signal<WeeklyMenu[]>([]);
  currentMenu = signal<WeeklyMenu | null>(null);
  loading = signal(false);
  currentMenuLoading = signal(false);
  error = signal(false);
  currentMenuError = signal(false);
  menusPanelCollapsed = signal(false);
  collapsedDays = signal<Set<string>>(new Set());
  searchQuery = signal('');
  favoritesOnly = signal(false);
  templatesOnly = signal(false);
  currentOnly = signal(false);
  showCloneDialog = signal(false);
  cloneSourceId = signal<string | null>(null);
  cloneForm = signal({ name: '' });

  ngOnInit() {
    this.load();
    this.loadCurrentMenu();
  }

  loadCurrentMenu() {
    this.currentMenuLoading.set(true);
    this.currentMenuError.set(false);
    this.repo.current().pipe(
      catchError((err: { status?: number }) => {
        if (err?.status === 404) return of(null);
        this.currentMenuError.set(true);
        return of(null);
      }),
    ).subscribe({
      next: (menu) => {
        if (!menu) {
          this.currentMenu.set(null);
          this.currentMenuLoading.set(false);
          return;
        }
        this.repo.get(menu.id).subscribe({
          next: (full) => {
            this.currentMenu.set(full);
            this.currentMenuLoading.set(false);
            this.collapsedDays.set(new Set(full.days.map((day) => day.id)));
          },
          error: () => {
            this.currentMenu.set(menu);
            this.currentMenuLoading.set(false);
            this.collapsedDays.set(new Set(menu.days.map((day) => day.id)));
          },
        });
      },
      error: () => {
        this.currentMenuLoading.set(false);
        this.currentMenuError.set(true);
      },
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number | boolean> = {};
    const search = this.searchQuery().trim();
    if (search) params['search'] = search;
    if (this.favoritesOnly()) params['is_favorite'] = true;
    if (this.templatesOnly()) params['is_template'] = true;
    if (this.currentOnly()) params['is_current'] = true;
    this.repo.list(params).subscribe({
      next: (res) => {
        let items = res;
        if (this.favoritesOnly()) items = items.filter((m) => m.isFavorite);
        if (this.templatesOnly()) items = items.filter((m) => m.isTemplate);
        if (this.currentOnly()) items = items.filter((m) => m.isCurrent);
        items = [...items].sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));
        this.menus.set(items);
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

  toggleTemplatesFilter() {
    this.templatesOnly.update((v) => !v);
    this.load();
  }

  toggleCurrentFilter() {
    this.currentOnly.update((v) => !v);
    this.load();
  }

  toggleMenusPanel() {
    this.menusPanelCollapsed.update((v) => !v);
  }

  isDayCollapsed(dayId: string): boolean {
    return this.collapsedDays().has(dayId);
  }

  toggleDay(dayId: string) {
    this.collapsedDays.update((set) => {
      const next = new Set(set);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  }

  sortedCurrentDays(): MenuDay[] {
    return [...(this.currentMenu()?.days ?? [])]
      .filter((day) => day.meals.some((meal) => meal.recipe != null))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  sortedDayMeals(day: MenuDay): MenuMeal[] {
    return [...day.meals].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  toggleFavorite(menu: WeeklyMenu, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.repo.toggleFavorite(menu.id).subscribe({
      next: (updated) => {
        this.menus.update((items) => {
          const next = items.map((item) => item.id === updated.id ? updated : item);
          if (this.favoritesOnly()) return next.filter((item) => item.isFavorite);
          return next;
        });
        this.toast.success(updated.isFavorite ? this.i18n.t('markAsFavorite') : this.i18n.t('removeFavorite'));
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Action failed' : 'Acción fallida'),
    });
  }

  setAsCurrent(menu: WeeklyMenu, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (menu.isCurrent) return;
    this.repo.setCurrent(menu.id).subscribe({
      next: (updated) => {
        this.applyCurrentMenu(updated);
        this.loadCurrentMenu();
        this.toast.success(this.i18n.t('markAsCurrent'));
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Action failed' : 'Acción fallida'),
    });
  }

  private applyCurrentMenu(updated: WeeklyMenu) {
    this.menus.update((items) => {
      const next = items.map((item) => {
        if (item.id === updated.id) return updated;
        if (updated.isCurrent) return { ...item, isCurrent: false };
        return item;
      });
      if (this.currentOnly()) return next.filter((item) => item.isCurrent);
      return [...next].sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));
    });
  }

  openCloneDialog(menu: WeeklyMenu, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.cloneSourceId.set(menu.id);
    this.cloneForm.set({
      name: `${menu.name} (${this.i18n.t('clone')})`,
    });
    this.showCloneDialog.set(true);
  }

  closeCloneDialog() {
    this.showCloneDialog.set(false);
  }

  updateCloneName(value: string) {
    this.cloneForm.update((f) => ({ ...f, name: value }));
  }

  confirmClone() {
    const sourceId = this.cloneSourceId();
    if (!sourceId) return;
    const form = this.cloneForm();
    if (!form.name.trim()) {
      this.toast.error(this.i18n.lang() === 'en' ? 'Name is required' : 'El nombre es obligatorio');
      return;
    }
    this.repo.clone(sourceId, {
      name: form.name,
    }).subscribe({
      next: (created) => {
        this.toast.success(this.i18n.t('clone'));
        this.closeCloneDialog();
        this.router.navigate(['/meal-planning/weekly-menus', created.id, 'edit']);
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Clone failed' : 'Error al clonar'),
    });
  }

  async deleteMenu(menu: WeeklyMenu, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const message =
      this.i18n.lang() === 'en'
        ? `Delete weekly menu "${menu.name}"?`
        : `¿Eliminar el menú semanal "${menu.name}"?`;
    const confirmed = await this.confirm.confirm(message, {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.repo.delete(menu.id).subscribe({
      next: () => {
        if (this.currentMenu()?.id === menu.id) this.currentMenu.set(null);
        this.toast.success(this.i18n.t('delete'));
        this.load();
        this.loadCurrentMenu();
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Delete failed' : 'Error al eliminar'),
    });
  }
}
