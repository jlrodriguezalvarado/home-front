import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

import { MenuMealRepository } from '../repositories/menu-meal.repository';
import { MenuMeal } from '../models/meal-planning.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';

@Component({
  selector: 'app-favorite-meal-picker',
  standalone: true,
  imports: [LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './favorite-meal-picker.component.html',
})
export class FavoriteMealPickerComponent implements OnInit {
  @Input({ required: true }) targetMenuDayId!: string;
  @Output() copied = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  repo = inject(MenuMealRepository);
  i18n = inject(I18nService);
  meals = signal<MenuMeal[]>([]);
  loading = signal(false);
  error = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.repo.favorites().subscribe({
      next: (res) => {
        this.meals.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  selectMeal(meal: MenuMeal) {
    this.repo
      .copyFavorite({
        sourceMenuMealId: meal.id,
        targetMenuDayId: this.targetMenuDayId,
      })
      .subscribe({
        next: () => this.copied.emit(),
        error: () => this.error.set(true),
      });
  }

  close() {
    this.closed.emit();
  }
}
