import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, takeUntil } from 'rxjs';
import { IngredientRepository } from '../repositories/ingredient.repository';
import { ProductRepository } from '../../products/product.repository';
import { CommerceRepository } from '../../commerce/commerce.repository';
import { Ingredient, IngredientFormValue } from '../models/meal-planning.models';
import { mapIngredientToFormValue } from '../mappers/meal-planning.mapper';
import { Product } from '../../../core/models/shopping.models';
import { Commerce } from '../../../core/api/models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';
import { SearchSelectComponent, SearchSelectOption } from '../../../shared/components/search-select.component';
import { DialogFormDirective } from '../../../shared/directives/dialog-form.directive';

@Component({
  selector: 'app-ingredient-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchSelectComponent, DialogFormDirective],
  templateUrl: './ingredient-form-dialog.component.html',
})
export class IngredientFormDialogComponent implements OnInit, OnDestroy {
  private readonly repo = inject(IngredientRepository);
  private readonly productRepo = inject(ProductRepository);
  private readonly commerceRepo = inject(CommerceRepository);
  private readonly toast = inject(ToastService);
  i18n = inject(I18nService);
  ingredient = input<Ingredient | null>(null);
  saved = output<Ingredient>();
  closed = output<void>();
  commerces = signal<Commerce[]>([]);
  dialogProducts = signal<Product[]>([]);
  productsLoading = signal(false);
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
    this.initForm(this.ingredient());
    this.commerceRepo.list().subscribe({
      next: (res) => {
        this.commerces.set(res);
        if (!this.editingId() && !this.selectedCommerceId() && res[0]) {
          this.selectedCommerceId.set(res[0].id);
          this.loadDialogProducts(true);
        }
      },
      error: () => this.commerces.set([]),
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.productSearchSubject.complete();
    this.productLoadTrigger.complete();
  }

  private initForm(ingredient: Ingredient | null) {
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
    this.loadDialogProducts(true);
  }

  close() {
    this.closed.emit();
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
        this.saved.emit(saved);
      },
      error: () => this.toast.error(this.i18n.lang() === 'en' ? 'Save failed' : 'Error al guardar'),
    });
  }
}
