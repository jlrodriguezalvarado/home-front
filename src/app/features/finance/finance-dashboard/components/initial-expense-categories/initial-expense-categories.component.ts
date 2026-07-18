import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FinanceRepository, FinanceCategory } from '../../../finance.repository';
import { bindFinancePeriodLoads } from '../../../finance-period-route.util';
import { ConfirmService } from '../../../../../shared/services/confirm.service';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { ToastService } from '../../../../../shared/services/toast.service';
import { DialogFormDirective } from '../../../../../shared/directives/dialog-form.directive';

@Component({
  selector: 'app-initial-expense-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DialogFormDirective],
  templateUrl: './initial-expense-categories.component.html',
})
export class InitialExpenseCategoriesComponent implements OnInit {
  repo = inject(FinanceRepository);
  route = inject(ActivatedRoute);
  confirm = inject(ConfirmService);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  categories = signal<FinanceCategory[]>([]);
  loading = signal(true);
  year = '';
  month = '';
  showDialog = false;
  editingId: string | null = null;
  saving = false;
  formName = '';

  ngOnInit() {
    bindFinancePeriodLoads(
      this.route,
      this.destroyRef,
      () => this.repo.listInitialExpenseCategories().pipe(catchError(() => of([]))),
      (categories, period) => {
        this.year = period.year;
        this.month = period.month;
        this.categories.set(categories);
        this.loading.set(false);
      },
      () => {
        this.categories.set([]);
        this.loading.set(true);
      },
    );
  }

  private reloadCategories() {
    this.loading.set(true);
    this.repo
      .listInitialExpenseCategories()
      .pipe(catchError(() => of([])))
      .subscribe((categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      });
  }

  openDialog(item?: FinanceCategory) {
    if (item) {
      this.editingId = item.id;
      this.formName = item.name;
    } else {
      this.editingId = null;
      this.formName = '';
    }
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
  }

  canSave(): boolean {
    return this.formName.trim().length > 0;
  }

  save() {
    const name = this.formName.trim();
    if (!name) return;
    this.saving = true;
    const onDone = () => {
      this.saving = false;
      this.reloadCategories();
      this.closeDialog();
      this.toast.success(this.i18n.lang() === 'en' ? 'Category saved' : 'Categoría guardada');
    };
    const onError = () => {
      this.saving = false;
      this.toast.error(this.i18n.lang() === 'en' ? 'Error saving category' : 'Error al guardar categoría');
    };

    if (this.editingId) {
      this.repo.updateInitialExpenseCategory(this.editingId, name).subscribe({ next: onDone, error: onError });
    } else {
      this.repo.createInitialExpenseCategory(name).subscribe({ next: onDone, error: onError });
    }
  }

  async deleteCategory(item: FinanceCategory) {
    const confirmed = await this.confirm.confirm(this.i18n.t('areYouSure'), {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.repo.deleteInitialExpenseCategory(item.id).subscribe({
      next: () => {
        this.reloadCategories();
        this.toast.success(this.i18n.lang() === 'en' ? 'Category deleted' : 'Categoría eliminada');
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Error deleting category' : 'Error al eliminar categoría'),
    });
  }
}
