import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FinanceRepository, FinanceDeclaration, FinanceCategory } from './finance.repository';
import { formatFinanceMoney } from './finance.utils';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-declaration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './declaration.component.html',
  styleUrl: './declaration.component.scss',
})
export class DeclarationComponent implements OnInit {
  repo = inject(FinanceRepository);
  route = inject(ActivatedRoute);
  i18n = inject(I18nService);
  toast = inject(ToastService);

  entries = signal<FinanceDeclaration[]>([]);
  categories = signal<FinanceCategory[]>([]);
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
    const paramRoute = this.findYearMonthRoute();
    if (!paramRoute) return;

    paramRoute.paramMap.subscribe((params) => {
      const year = params.get('year');
      const month = params.get('month');
      if (!year || !month) return;
      this.year = year;
      this.month = month;
      this.load();
      this.loadCategories();
    });
  }

  private findYearMonthRoute(): ActivatedRoute | null {
    let route: ActivatedRoute | null = this.route;
    while (route) {
      if (route.snapshot.paramMap.has('year') && route.snapshot.paramMap.has('month')) {
        return route;
      }
      route = route.parent;
    }
    return null;
  }

  loadCategories() {
    this.repo.listGeneralExpenseCategories().subscribe({
      next: (res) => this.categories.set(res),
      error: () => this.categories.set([]),
    });
  }

  load() {
    this.repo.listDeclarations(this.year, this.month).subscribe({
      next: (res) => this.entries.set(res),
      error: () => this.entries.set([]),
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
      this.form = { title: 'Declaration', content: '', amount: '', generalExpenseCategoryId: '', notes: '' };
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
      this.load();
      this.closeDialog();
      this.toast.success(this.i18n.lang() === 'en' ? 'Declaration saved' : 'Declaración guardada');
    };
    const onError = () => {
      this.saving = false;
      this.toast.error(this.i18n.lang() === 'en' ? 'Error saving declaration' : 'Error al guardar declaración');
    };

    if (this.editingId) {
      this.repo.updateDeclaration(this.editingId, data).subscribe({ next: onDone, error: onError });
    } else {
      this.repo.createDeclaration(this.year, this.month, data).subscribe({ next: onDone, error: onError });
    }
  }
}
