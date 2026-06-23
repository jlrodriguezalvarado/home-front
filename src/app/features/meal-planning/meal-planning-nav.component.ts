import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService, AppStringKey } from '../../core/i18n/i18n.service';

interface MealPlanningNavItem {
  route: string;
  labelKey: AppStringKey;
}

@Component({
  selector: 'app-meal-planning-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="flex flex-wrap gap-sm mb-lg">
      <a
        *ngFor="let item of items"
        [routerLink]="item.route"
        routerLinkActive="nav-item-active"
        [routerLinkActiveOptions]="{ exact: false }"
        class="nav-item-inactive px-md py-sm rounded-xl text-label-lg">
        {{ i18n.t(item.labelKey) }}
      </a>
    </nav>
  `,
})
export class MealPlanningNavComponent {
  i18n = inject(I18nService);
  items: MealPlanningNavItem[] = [
    { route: '/meal-planning/weekly-menus', labelKey: 'weeklyMenus' },
    { route: '/meal-planning/recipes', labelKey: 'recipes' },
    { route: '/meal-planning/ingredients', labelKey: 'ingredients' },
    { route: '/meal-planning/meal-types', labelKey: 'mealTypes' },
  ];
}
