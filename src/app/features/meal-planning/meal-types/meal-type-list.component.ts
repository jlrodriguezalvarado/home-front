import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MealTypeRepository } from '../repositories/meal-type.repository';
import { MealType, MealTypePayload } from '../models/meal-planning.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { DialogFormDirective } from '../../../shared/directives/dialog-form.directive';
import { MealPlanningNavComponent } from '../meal-planning-nav.component';

@Component({
  selector: 'app-meal-type-list',
  standalone: true,
  imports: [
    FormsModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    DialogFormDirective,
    MealPlanningNavComponent,
  ],
  templateUrl: './meal-type-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './meal-type-list.component.scss',
})
export class MealTypeListComponent implements OnInit {
  repo = inject(MealTypeRepository);
  i18n = inject(I18nService);
  confirm = inject(ConfirmService);
  toast = inject(ToastService);
  mealTypes = signal<MealType[]>([]);
  loading = signal(false);
  error = signal(false);
  showDialog = signal(false);
  editingId = signal<string | null>(null);
  form = signal<MealTypePayload>({
    name: '',
    code: '',
    sortOrder: 0,
    isActive: true,
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.repo.list().subscribe({
      next: (res) => {
        this.mealTypes.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  openDialog(mealType?: MealType) {
    if (mealType) {
      this.editingId.set(mealType.id);
      this.form.set({
        name: mealType.name,
        code: mealType.code,
        sortOrder: mealType.sortOrder,
        isActive: mealType.isActive,
      });
    } else {
      this.editingId.set(null);
      const nextOrder = this.mealTypes().length;
      this.form.set({ name: '', code: '', sortOrder: nextOrder, isActive: true });
    }
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  updateFormField<K extends keyof MealTypePayload>(key: K, value: MealTypePayload[K]) {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  save() {
    const payload = this.form();
    if (!payload.name.trim() || !payload.code.trim()) {
      this.toast.error(
        this.i18n.lang() === 'en'
          ? 'Name and code are required'
          : 'Nombre y código son obligatorios',
      );
      return;
    }
    const editingId = this.editingId();
    const request$ = editingId ? this.repo.update(editingId, payload) : this.repo.create(payload);
    request$.subscribe({
      next: () => {
        this.toast.success(this.i18n.t('save'));
        this.closeDialog();
        this.load();
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Save failed' : 'Error al guardar'),
    });
  }

  async deleteMealType(mealType: MealType) {
    const message =
      this.i18n.lang() === 'en'
        ? `Delete meal type "${mealType.name}"?`
        : `¿Eliminar el tipo de comida "${mealType.name}"?`;
    const confirmed = await this.confirm.confirm(message, {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.repo.delete(mealType.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('delete'));
        this.load();
      },
      error: () =>
        this.toast.error(this.i18n.lang() === 'en' ? 'Delete failed' : 'Error al eliminar'),
    });
  }

  toggleActive(mealType: MealType) {
    this.repo
      .update(mealType.id, {
        name: mealType.name,
        code: mealType.code,
        sortOrder: mealType.sortOrder,
        isActive: !mealType.isActive,
      })
      .subscribe({
        next: () => this.load(),
        error: () =>
          this.toast.error(this.i18n.lang() === 'en' ? 'Update failed' : 'Error al actualizar'),
      });
  }
}
