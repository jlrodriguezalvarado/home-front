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

import { FormsModule } from '@angular/forms';
import { MenuDayRepository } from '../repositories/menu-day.repository';
import { MenuDay } from '../models/meal-planning.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { DialogEscapeDirective } from '../../../shared/directives/dialog-escape.directive';

@Component({
  selector: 'app-favorite-day-picker',
  standalone: true,
  imports: [FormsModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent, DialogEscapeDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './favorite-day-picker.component.html',
})
export class FavoriteDayPickerComponent implements OnInit {
  @Input({ required: true }) targetWeeklyMenuId!: string;
  @Input({ required: true }) targetDayOfWeek!: number;
  @Output() copied = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  repo = inject(MenuDayRepository);
  i18n = inject(I18nService);
  days = signal<MenuDay[]>([]);
  loading = signal(false);
  error = signal(false);
  selectedDayId = signal<string | null>(null);
  replaceExisting = signal(true);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.repo.favorites().subscribe({
      next: (res) => {
        this.days.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  selectDay(day: MenuDay) {
    this.selectedDayId.set(day.id);
  }

  confirmCopy() {
    const sourceMenuDayId = this.selectedDayId();
    if (!sourceMenuDayId) return;
    this.repo
      .copyFavorite({
        sourceMenuDayId,
        targetWeeklyMenuId: this.targetWeeklyMenuId,
        targetDayOfWeek: this.targetDayOfWeek,
        replaceExisting: this.replaceExisting(),
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
