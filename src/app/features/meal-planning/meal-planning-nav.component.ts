import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService, AppStringKey } from '../../core/i18n/i18n.service';

interface MealPlanningNavItem {
  route: string;
  labelKey: AppStringKey;
}

@Component({
  selector: 'app-meal-planning-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <nav class="mb-lg flex flex-wrap gap-xs">
      @for (item of items; track item) {
        <a
          [routerLink]="item.route"
          routerLinkActive="nav-item-active"
          [routerLinkActiveOptions]="{ exact: false }"
          class="nav-item-inactive mx-0 rounded-xl px-sm py-sm text-label-lg"
        >
          {{ i18n.t(item.labelKey) }}
        </a>
      }
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
