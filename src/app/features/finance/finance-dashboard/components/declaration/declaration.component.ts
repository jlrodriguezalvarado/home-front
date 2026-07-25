import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  FinanceRepository,
  FinanceDeclaration,
  FinanceCategory,
} from '../../../finance.repository';
import { bindFinancePeriodLoads } from '../../../finance-period-route.util';
import { formatFinanceMoney } from '../../../finance.utils';
import { I18nService } from '../../../../../core/i18n/i18n.service';
import { ToastService } from '../../../../../shared/services/toast.service';
import { DialogFormDirective } from '../../../../../shared/directives/dialog-form.directive';

@Component({
  selector: 'app-declaration',
  standalone: true,
  imports: [FormsModule, DialogFormDirective],
  templateUrl: './declaration.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './declaration.component.scss',
})
export class DeclarationComponent implements OnInit {
  repo = inject(FinanceRepository);
  route = inject(ActivatedRoute);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  entries = signal<FinanceDeclaration[]>([]);
  categories = signal<FinanceCategory[]>([]);
  loading = signal(true);
  year = '';
  month = '';
  showDialog = false;
  editingId: string | null = null;
  saving = false;
  form = {
    title: '',
    content: '',
    amount: '',
    generalExpenseCategoryId: '',
    notes: '',
  };

  formatMoney = formatFinanceMoney;

  ngOnInit() {
    bindFinancePeriodLoads(
      this.route,
      this.destroyRef,
      (period) =>
        forkJoin({
          entries: this.repo
            .listDeclarations(period.year, period.month)
            .pipe(catchError(() => of([]))),
          categories: this.repo.listGeneralExpenseCategories().pipe(catchError(() => of([]))),
        }),
      ({ entries, categories }, period) => {
        this.year = period.year;
        this.month = period.month;
        this.entries.set(entries);
        this.categories.set(categories);
        this.loading.set(false);
      },
      () => {
        this.entries.set([]);
        this.loading.set(true);
      },
    );
  }

  private reloadEntries() {
    if (!this.year || !this.month) return;
    this.loading.set(true);
    this.repo
      .listDeclarations(this.year, this.month)
      .pipe(catchError(() => of([])))
      .subscribe((entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      });
  }

  openDialog(item?: FinanceDeclaration) {
    if (item) {
      this.editingId = item.id;
      this.form = {
        title: item.title,
        content: item.content,
        amount: item.amount ?? '',
        generalExpenseCategoryId: item.generalExpenseCategoryId ?? '',
        notes: item.notes ?? '',
      };
    } else {
      this.editingId = null;
      this.form = {
        title: 'Declaration',
        content: '',
        amount: '',
        generalExpenseCategoryId: '',
        notes: '',
      };
    }
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
  }

  save() {
    this.saving = true;
    const data = { ...this.form };
    const onDone = () => {
      this.saving = false;
      this.reloadEntries();
      this.closeDialog();
      this.toast.success(this.i18n.lang() === 'en' ? 'Declaration saved' : 'Declaración guardada');
    };
    const onError = () => {
      this.saving = false;
      this.toast.error(
        this.i18n.lang() === 'en' ? 'Error saving declaration' : 'Error al guardar declaración',
      );
    };

    if (this.editingId) {
      this.repo.updateDeclaration(this.editingId, data).subscribe({ next: onDone, error: onError });
    } else {
      this.repo
        .createDeclaration(this.year, this.month, data)
        .subscribe({ next: onDone, error: onError });
    }
  }
}
