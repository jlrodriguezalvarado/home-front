import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, finalize, forkJoin } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { DialogFormDirective } from '../../shared/directives/dialog-form.directive';
import { DialogEscapeDirective } from '../../shared/directives/dialog-escape.directive';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService } from '../../shared/services/toast.service';
import {
  ComparisonCategory,
  ComparisonPrice,
  ComparisonProduct,
  ComparisonStore,
  PriceComparison,
  PriceComparisonReport,
} from './price-comparison.models';
import { PriceComparisonRepository } from './price-comparison.repository';
import { formatDecimalMoney, normalizePriceInput } from './price-comparison.money';
type Section = 'setup' | 'prices' | 'report';
type EditorType = 'comparison' | 'store' | 'category' | 'product';
type ManagedEntity = PriceComparison | ComparisonStore | ComparisonCategory | ComparisonProduct;
const COPY = {
  en: {
    title: 'Price comparisons',
    subtitle: 'Compare independent products and stores in one place.',
    newComparison: 'New comparison',
    selectComparison: 'Select a comparison',
    noComparisons: 'No price comparisons yet',
    noComparisonsHint: 'Create one to start adding stores, categories, products and prices.',
    setup: 'Setup',
    prices: 'Price matrix',
    report: 'Comparison report',
    stores: 'Stores',
    categories: 'Categories',
    products: 'Products',
    addStore: 'Add store',
    addCategory: 'Add category',
    addProduct: 'Add product',
    noStores: 'No stores have been added.',
    noCategories: 'No categories have been added.',
    noProducts: 'No products have been added.',
    optional: 'Optional',
    productCategories: 'Product categories',
    priceHint: 'Enter a price and save each cell. Empty cells do not have a recorded offer.',
    savePrice: 'Save price',
    deletePrice: 'Delete price',
    noMatrix: 'Add at least one store and one product to use the matrix.',
    loadingError: 'Could not load price comparison data.',
    saveError: 'Could not save the changes.',
    deleteError: 'Could not delete the item.',
    saved: 'Changes saved',
    deleted: 'Item deleted',
    requiredName: 'Name is required.',
    invalidPrice: 'Enter a valid non-negative price.',
    confirmDelete: 'Delete "{name}"? This action cannot be undone.',
    editItem: 'Edit {item}',
    addItem: 'Add {item}',
    comparison: 'comparison',
    store: 'store',
    category: 'category',
    product: 'product',
    refreshReport: 'Refresh report',
    reportEmpty: 'The report has no products yet.',
    minPrice: 'Minimum',
    maxPrice: 'Maximum',
    range: 'Range',
    cheapestOffers: 'Cheapest offer',
    noPrice: 'No price',
    productsByMinimum: 'Products by minimum price',
    storeRanking: 'Store basket ranking',
    basketTotal: 'Basket total',
    priced: 'priced',
    missing: 'missing',
    complete: 'Complete basket',
    incomplete: 'Incomplete basket',
    bestComplete: 'Best complete basket store',
    noCompleteBasket: 'No store has a complete basket.',
    reportSummary: 'Report summary',
    reportBackend: 'Calculated by the latest backend report.',
    editComparison: 'Edit comparison',
    deleteComparison: 'Delete comparison',
    loading: 'Loading...',
    description: 'Description',
    name: 'Name',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
  },
  es: {
    title: 'Comparativas de precios',
    subtitle: 'Compara productos y tiendas independientes en un solo lugar.',
    newComparison: 'Nueva comparativa',
    selectComparison: 'Selecciona una comparativa',
    noComparisons: 'Aún no hay comparativas de precios',
    noComparisonsHint: 'Crea una para comenzar a agregar tiendas, categorías, productos y precios.',
    setup: 'Administración',
    prices: 'Matriz de precios',
    report: 'Reporte comparativo',
    stores: 'Tiendas',
    categories: 'Categorías',
    products: 'Productos',
    addStore: 'Agregar tienda',
    addCategory: 'Agregar categoría',
    addProduct: 'Agregar producto',
    noStores: 'No se han agregado tiendas.',
    noCategories: 'No se han agregado categorías.',
    noProducts: 'No se han agregado productos.',
    optional: 'Opcional',
    productCategories: 'Categorías del producto',
    priceHint:
      'Introduce un precio y guarda cada celda. Las celdas vacías no tienen una oferta registrada.',
    savePrice: 'Guardar precio',
    deletePrice: 'Eliminar precio',
    noMatrix: 'Agrega al menos una tienda y un producto para usar la matriz.',
    loadingError: 'No se pudieron cargar los datos de la comparativa.',
    saveError: 'No se pudieron guardar los cambios.',
    deleteError: 'No se pudo eliminar el elemento.',
    saved: 'Cambios guardados',
    deleted: 'Elemento eliminado',
    requiredName: 'El nombre es obligatorio.',
    invalidPrice: 'Introduce un precio válido mayor o igual a cero.',
    confirmDelete: '¿Eliminar "{name}"? Esta acción no se puede deshacer.',
    editItem: 'Editar {item}',
    addItem: 'Agregar {item}',
    comparison: 'comparativa',
    store: 'tienda',
    category: 'categoría',
    product: 'producto',
    refreshReport: 'Actualizar reporte',
    reportEmpty: 'El reporte aún no tiene productos.',
    minPrice: 'Mínimo',
    maxPrice: 'Máximo',
    range: 'Rango',
    cheapestOffers: 'Oferta más barata',
    noPrice: 'Sin precio',
    productsByMinimum: 'Productos por precio mínimo',
    storeRanking: 'Ranking de canastas por tienda',
    basketTotal: 'Total de canasta',
    priced: 'con precio',
    missing: 'faltantes',
    complete: 'Canasta completa',
    incomplete: 'Canasta incompleta',
    bestComplete: 'Mejor tienda con canasta completa',
    noCompleteBasket: 'Ninguna tienda tiene una canasta completa.',
    reportSummary: 'Resumen del reporte',
    reportBackend: 'Calculado por el último reporte del backend.',
    editComparison: 'Editar comparativa',
    deleteComparison: 'Eliminar comparativa',
    loading: 'Cargando...',
    description: 'Descripción',
    name: 'Nombre',
    cancel: 'Cancelar',
    save: 'Guardar',
    edit: 'Editar',
    delete: 'Eliminar',
  },
} as const;
type CopyKey = keyof typeof COPY.en;
@Component({
  selector: 'app-price-comparison-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    DialogFormDirective,
    DialogEscapeDirective,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './price-comparison-dashboard.component.html',
})
export class PriceComparisonDashboardComponent implements OnInit {
  readonly repo = inject(PriceComparisonRepository);
  readonly i18n = inject(I18nService);
  readonly confirm = inject(ConfirmService);
  readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly comparisons = signal<PriceComparison[]>([]);
  readonly selected = signal<PriceComparison | null>(null);
  readonly stores = signal<ComparisonStore[]>([]);
  readonly categories = signal<ComparisonCategory[]>([]);
  readonly products = signal<ComparisonProduct[]>([]);
  readonly prices = signal<ComparisonPrice[]>([]);
  readonly report = signal<PriceComparisonReport | null>(null);
  readonly loadingComparisons = signal(true);
  readonly loadingDetails = signal(false);
  readonly loadingReport = signal(false);
  readonly listError = signal(false);
  readonly detailsError = signal(false);
  readonly reportError = signal(false);
  readonly section = signal<Section>('setup');
  readonly editor = signal<EditorType | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly savingCells = signal<Set<string>>(new Set());
  readonly priceDrafts = signal<Record<string, string>>({});
  form = { name: '', description: '', categoryIds: [] as string[] };
  ngOnInit(): void {
    this.loadComparisons();
  }
  tr(key: CopyKey, params?: Record<string, string>): string {
    let result: string = COPY[this.i18n.lang()][key];
    for (const [name, replacement] of Object.entries(params ?? {}))
      result = result.replace(`{${name}}`, replacement);
    return result;
  }
  loadComparisons(preferredId?: string): void {
    this.loadingComparisons.set(true);
    this.listError.set(false);
    this.repo
      .listComparisons()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingComparisons.set(false)),
      )
      .subscribe({
        next: (items) => {
          this.comparisons.set(items);
          const currentId = preferredId ?? this.selected()?.id;
          const next = items.find((item) => item.id === currentId) ?? null;
          if (next) this.selectComparison(next);
          else if (this.selected()) this.clearSelection();
        },
        error: () => {
          this.listError.set(true);
        },
      });
  }
  selectComparison(comparison: PriceComparison): void {
    if (this.selected()?.id === comparison.id && !this.detailsError()) return;
    this.selected.set(comparison);
    this.report.set(null);
    this.section.set('setup');
    this.loadDetails();
  }
  loadDetails(): void {
    const comparison = this.selected();
    if (!comparison) return;
    this.loadingDetails.set(true);
    this.detailsError.set(false);
    forkJoin({
      stores: this.repo.listStores(comparison.id),
      categories: this.repo.listCategories(comparison.id),
      products: this.repo.listProducts(comparison.id),
      prices: this.repo.listPrices(comparison.id),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingDetails.set(false)),
      )
      .subscribe({
        next: ({ stores, categories, products, prices }) => {
          this.stores.set(stores);
          this.categories.set(categories);
          this.products.set(products);
          this.prices.set(prices);
          this.priceDrafts.set(
            Object.fromEntries(
              prices.map((price) => [this.cellKey(price.storeId, price.productId), price.price]),
            ),
          );
        },
        error: () => {
          this.detailsError.set(true);
        },
      });
  }
  changeSection(next: Section): void {
    this.section.set(next);
    if (next === 'report') this.loadReport();
  }
  loadReport(): void {
    const comparison = this.selected();
    if (!comparison) return;
    this.loadingReport.set(true);
    this.reportError.set(false);
    this.repo
      .getReport(comparison.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingReport.set(false)),
      )
      .subscribe({
        next: (report) => {
          this.report.set(report);
        },
        error: () => {
          this.report.set(null);
          this.reportError.set(true);
        },
      });
  }
  openEditor(type: EditorType, entity?: ManagedEntity): void {
    this.editor.set(type);
    this.editingId.set(entity?.id ?? null);
    this.form = {
      name: entity?.name ?? '',
      description:
        'description' in (entity ?? {})
          ? String((entity as PriceComparison | ComparisonStore | ComparisonProduct).description)
          : '',
      categoryIds:
        type === 'product' && entity
          ? (entity as ComparisonProduct).categories.map((category) => category.id)
          : [],
    };
  }
  closeEditor(): void {
    if (this.saving()) return;
    this.editor.set(null);
    this.editingId.set(null);
  }
  toggleCategory(categoryId: string, checked: boolean): void {
    this.form.categoryIds = checked
      ? [...this.form.categoryIds, categoryId]
      : this.form.categoryIds.filter((id) => id !== categoryId);
  }
  saveEntity(): void {
    const type = this.editor();
    const comparison = this.selected();
    const name = this.form.name.trim();
    if (!type || !name) {
      this.toast.error(this.tr('requiredName'));
      return;
    }
    if (type !== 'comparison' && !comparison) return;
    const id = this.editingId();
    this.saving.set(true);
    let request$: Observable<ManagedEntity>;
    if (type === 'comparison') {
      const payload = { name, description: this.form.description.trim() };
      request$ = id ? this.repo.updateComparison(id, payload) : this.repo.createComparison(payload);
    } else if (type === 'store') {
      const payload = {
        comparison: comparison!.id,
        name,
        description: this.form.description.trim(),
      };
      request$ = id ? this.repo.updateStore(id, payload) : this.repo.createStore(payload);
    } else if (type === 'category') {
      const payload = { comparison: comparison!.id, name };
      request$ = id ? this.repo.updateCategory(id, payload) : this.repo.createCategory(payload);
    } else {
      const payload = {
        comparison: comparison!.id,
        name,
        description: this.form.description.trim(),
        category_ids: this.form.categoryIds,
      };
      request$ = id ? this.repo.updateProduct(id, payload) : this.repo.createProduct(payload);
    }
    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (saved) => {
          this.editor.set(null);
          this.toast.success(this.tr('saved'));
          if (type === 'comparison') this.loadComparisons(saved.id);
          else {
            this.report.set(null);
            this.loadDetails();
          }
        },
        error: () => {
          this.toast.error(this.tr('saveError'));
        },
      });
  }
  async deleteEntity(type: EditorType, entity: ManagedEntity): Promise<void> {
    const confirmed = await this.confirm.confirm(this.tr('confirmDelete', { name: entity.name }), {
      variant: 'danger',
      confirmLabel: this.tr('delete'),
    });
    if (!confirmed) return;
    const request$ =
      type === 'comparison'
        ? this.repo.deleteComparison(entity.id)
        : type === 'store'
          ? this.repo.deleteStore(entity.id)
          : type === 'category'
            ? this.repo.deleteCategory(entity.id)
            : this.repo.deleteProduct(entity.id);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(this.tr('deleted'));
        if (type === 'comparison') {
          this.clearSelection();
          this.loadComparisons();
        } else {
          this.report.set(null);
          this.loadDetails();
        }
      },
      error: () => this.toast.error(this.tr('deleteError')),
    });
  }
  updateDraft(storeId: string, productId: string, price: string): void {
    this.priceDrafts.update((drafts) => ({ ...drafts, [this.cellKey(storeId, productId)]: price }));
  }
  priceFor(storeId: string, productId: string): ComparisonPrice | undefined {
    return this.prices().find(
      (price) => price.storeId === storeId && price.productId === productId,
    );
  }
  savePrice(storeId: string, productId: string): void {
    const key = this.cellKey(storeId, productId);
    const raw = this.priceDrafts()[key]?.trim() ?? '';
    const normalized = normalizePriceInput(raw);
    if (normalized === null) {
      this.toast.error(this.tr('invalidPrice'));
      return;
    }
    const existing = this.priceFor(storeId, productId);
    this.setCellSaving(key, true);
    const request$ = existing
      ? this.repo.updatePrice(existing.id, { price: normalized })
      : this.repo.createPrice({ store_id: storeId, product_id: productId, price: normalized });
    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.setCellSaving(key, false)),
      )
      .subscribe({
        next: (saved) => {
          this.prices.update((items) =>
            existing
              ? items.map((item) => (item.id === saved.id ? saved : item))
              : [...items, saved],
          );
          this.updateDraft(storeId, productId, saved.price);
          this.report.set(null);
          this.toast.success(this.tr('saved'));
        },
        error: () => {
          this.toast.error(this.tr('saveError'));
        },
      });
  }
  async deleteCellPrice(storeId: string, productId: string): Promise<void> {
    const existing = this.priceFor(storeId, productId);
    if (!existing) return;
    const confirmed = await this.confirm.confirm(
      this.tr('confirmDelete', { name: `${existing.price}` }),
      { variant: 'danger', confirmLabel: this.tr('delete') },
    );
    if (!confirmed) return;
    const key = this.cellKey(storeId, productId);
    this.setCellSaving(key, true);
    this.repo
      .deletePrice(existing.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.setCellSaving(key, false)),
      )
      .subscribe({
        next: () => {
          this.prices.update((items) => items.filter((item) => item.id !== existing.id));
          this.priceDrafts.update((drafts) => ({ ...drafts, [key]: '' }));
          this.report.set(null);
          this.toast.success(this.tr('deleted'));
        },
        error: () => {
          this.toast.error(this.tr('deleteError'));
        },
      });
  }
  isCellSaving(storeId: string, productId: string): boolean {
    return this.savingCells().has(this.cellKey(storeId, productId));
  }
  categoryNames(product: ComparisonProduct): string {
    return product.categories.map((category) => category.name).join(', ');
  }
  categoryList(categories: { name: string }[]): string {
    return categories.map((category) => category.name).join(', ');
  }
  formatPrice(value: string | null): string {
    return formatDecimalMoney(value, this.i18n.lang());
  }
  private cellKey(storeId: string, productId: string): string {
    return `${storeId}:${productId}`;
  }
  private setCellSaving(key: string, saving: boolean): void {
    this.savingCells.update((current) => {
      const next = new Set(current);
      if (saving) next.add(key);
      else next.delete(key);
      return next;
    });
  }
  private clearSelection(): void {
    this.selected.set(null);
    this.stores.set([]);
    this.categories.set([]);
    this.products.set([]);
    this.prices.set([]);
    this.report.set(null);
  }
}
