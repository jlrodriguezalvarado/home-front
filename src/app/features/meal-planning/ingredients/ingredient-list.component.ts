import { Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of, takeUntil } from 'rxjs';
import { IngredientRepository } from '../repositories/ingredient.repository';
import { ProductRepository } from '../../products/product.repository';
import { CommerceRepository } from '../../commerce/commerce.repository';
import { Ingredient, IngredientFormValue } from '../models/meal-planning.models';
import { mapIngredientToFormValue } from '../mappers/meal-planning.mapper';
import { Product } from '../../../core/models/shopping.models';
import { Commerce } from '../../../core/api/models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { SearchSelectComponent, SearchSelectOption } from '../../../shared/components/search-select.component';
import { DialogFormDirective } from '../../../shared/directives/dialog-form.directive';
import { MealPlanningNavComponent } from '../meal-planning-nav.component';

@Component({
  selector: 'app-ingredient-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SearchSelectComponent,
    DialogFormDirective,
    MealPlanningNavComponent,
  ],
  templateUrl: './ingredient-list.component.html',
  styleUrl: './ingredient-list.component.scss',
})
export class IngredientListComponent implements OnInit, OnDestroy {
  repo = inject(IngredientRepository);
  productRepo = inject(ProductRepository);
  commerceRepo = inject(CommerceRepository);
  i18n = inject(I18nService);
  confirm = inject(ConfirmService);
  toast = inject(ToastService);
  ingredients = signal<Ingredient[]>([]);
  filteredIngredients = signal<Ingredient[]>([]);
  commerces = signal<Commerce[]>([]);
  dialogProducts = signal<Product[]>([]);
  loading = signal(false);
  error = signal(false);
  productsLoading = signal(false);
  searchQuery = signal('');
  activeFilter = signal<'all' | 'active' | 'inactive'>('all');
  showDialog = signal(false);
  editingId = signal<string | null>(null);
  selectedCommerceId = signal<string | null>(null);
  productSearchDraft = signal('');
  selectedProductOption = signal<SearchSelectOption | null>(null);
  form = signal<IngredientFormValue>({
    name: '',
    description: '',
    defaultProductId: null,
    isActive: true,
  });
  productOptions = computed<SearchSelectOption[]>(() => {
    const base = this.dialogProducts().map((p) => ({ value: p.apiId, label: p.name }));
    const extra = this.selectedProductOption();
    if (extra && !base.some((o) => o.value === extra.value)) {
      return [extra, ...base];
    }
    return base;
  });
  private productSearchSubject = new Subject<string>();
  private productLoadTrigger = new Subject<{ commerceId: string; search?: string }>();
  private readonly destroy$ = new Subject<void>();

  ngOnInit() {
    this.load();
    this.commerceRepo.list().subscribe({
      next: (res) => this.commerces.set(res),
      error: () => this.commerces.set([]),
    });
    this.productSearchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe((query) => {
      this.productSearchDraft.set(query);
      if (!this.selectedCommerceId()) return;
      this.loadDialogProducts();
    });
    this.productLoadTrigger.pipe(
      switchMap(({ commerceId, search }) => {
        this.productsLoading.set(true);
        return this.productRepo.list({
          commerce_id: commerceId,
          search,
          page: 1,
          perPage: 50,
        }).pipe(
          catchError(() => of({ count: 0, next: null, previous: null, results: [] as Product[] })),
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe((res) => {
      this.dialogProducts.set(res.results);
      this.productsLoading.set(false);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.productSearchSubject.complete();
    this.productLoadTrigger.complete();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number | boolean> = {};
    const search = this.searchQuery().trim();
    if (search) params['search'] = search;
    this.repo.list(params).subscribe({
      next: (res) => {
        this.ingredients.set(res);
        this.applyFilter();
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

  onActiveFilterChange(value: 'all' | 'active' | 'inactive') {
    this.activeFilter.set(value);
    this.applyFilter();
  }

  applyFilter() {
    const filter = this.activeFilter();
    let items = this.ingredients();
    if (filter === 'active') items = items.filter((i) => i.isActive);
    if (filter === 'inactive') items = items.filter((i) => !i.isActive);
    this.filteredIngredients.set(items);
  }

  openDialog(ingredient?: Ingredient) {
    this.dialogProducts.set([]);
    if (ingredient) {
      this.editingId.set(ingredient.id);
      this.form.set(mapIngredientToFormValue(ingredient));
      const defaultProduct = ingredient.defaultProduct;
      this.selectedCommerceId.set(defaultProduct?.commerceId ?? null);
      this.selectedProductOption.set(
        defaultProduct
          ? { value: defaultProduct.id, label: defaultProduct.name }
          : null,
      );
      this.productSearchDraft.set(defaultProduct?.name ?? '');
      this.showDialog.set(true);
      if (defaultProduct?.commerceId) {
        this.loadDialogProducts();
      }
      return;
    }
    this.editingId.set(null);
    this.form.set({ name: '', description: '', defaultProductId: null, isActive: true });
    this.selectedCommerceId.set(this.commerces()[0]?.id ?? null);
    this.selectedProductOption.set(null);
    this.productSearchDraft.set('');
    this.showDialog.set(true);
    this.loadDialogProducts(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  updateFormField<K extends keyof IngredientFormValue>(key: K, value: IngredientFormValue[K]) {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  onCommerceChange(commerceId: string) {
    this.selectedCommerceId.set(commerceId || null);
    this.updateFormField('defaultProductId', null);
    this.selectedProductOption.set(null);
    this.productSearchDraft.set('');
    this.loadDialogProducts(true);
  }

  onProductSelected(productId: string | null) {
    this.updateFormField('defaultProductId', productId);
    if (productId) {
      const product = this.dialogProducts().find((p) => p.apiId === productId);
      this.selectedProductOption.set(product ? { value: product.apiId, label: product.name } : null);
    } else {
      this.selectedProductOption.set(null);
    }
  }

  onProductSearchChange(query: string) {
    this.productSearchDraft.set(query);
    if (!this.selectedCommerceId()) return;
    this.productSearchSubject.next(query);
  }

  loadDialogProducts(resetSearch = false) {
    const commerceId = this.selectedCommerceId();
    if (!commerceId) {
      this.dialogProducts.set([]);
      this.productsLoading.set(false);
      return;
    }
    if (resetSearch) {
      this.productSearchDraft.set('');
    }
    const search = this.resolveProductSearch();
    this.productLoadTrigger.next({ commerceId, search });
  }

  private resolveProductSearch(): string | undefined {
    const query = this.productSearchDraft().trim();
    if (query) return query;
    const selected = this.selectedProductOption();
    if (this.editingId() && selected?.label.trim()) {
      return selected.label.trim();
    }
    return undefined;
  }

  save() {
    const payload = this.form();
    if (!payload.name.trim()) {
      this.toast.error(this.i18n.lang() === 'en' ? 'Name is required' : 'El nombre es obligatorio');
      return;
    }
    const editingId = this.editingId();
    const request$ = editingId
      ? this.repo.update(editingId, payload)
      : this.repo.create(payload);
    request$.subscribe({
      next: (saved) => {
        this.toast.success(this.i18n.t('save'));
        this.closeDialog();
        this.ingredients.update((items) => {
          const index = items.findIndex((item) => item.id === saved.id);
          if (index === -1) return [saved, ...items];
          return items.map((item) => (item.id === saved.id ? saved : item));
        });
        this.applyFilter();
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Save failed' : 'Error al guardar'),
    });
  }

  async deleteIngredient(ingredient: Ingredient) {
    const message =
      this.i18n.lang() === 'en'
        ? `Delete ingredient "${ingredient.name}"?`
        : `¿Eliminar el ingrediente "${ingredient.name}"?`;
    const confirmed = await this.confirm.confirm(message, {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.repo.delete(ingredient.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('delete'));
        this.load();
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Delete failed' : 'Error al eliminar'),
    });
  }
}
