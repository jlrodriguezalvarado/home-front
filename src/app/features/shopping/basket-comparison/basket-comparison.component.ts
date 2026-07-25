import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Product } from '../../../core/models/shopping.models';
import { ConfirmService } from '../../../shared/services/confirm.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Commerce } from '../../commerce/commerce.models';
import { CommerceRepository } from '../../commerce/commerce.repository';
import { CartService } from '../cart.service';
import { formatPrice } from '../utils/price.utils';
import {
  BasketComparisonDetail,
  BasketComparisonLine,
  BasketComparisonListItem,
  BasketComparisonPriceCell,
} from './basket-comparison.models';
import { BasketComparisonRepository } from './basket-comparison.repository';
import { ProductLinkDialogComponent } from './components/product-link-dialog/product-link-dialog.component';

interface LinkDialogState {
  lineId: string;
  commerceId: string;
}

@Component({
  selector: 'app-basket-comparison',
  standalone: true,
  imports: [FormsModule, ProductLinkDialogComponent],
  templateUrl: './basket-comparison.component.html',
  styleUrl: './basket-comparison.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class BasketComparisonComponent implements OnInit {
  private readonly repo = inject(BasketComparisonRepository);
  private readonly commerceRepo = inject(CommerceRepository);
  private readonly cart = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);
  readonly toast = inject(ToastService);
  readonly confirm = inject(ConfirmService);
  loading = signal(true);
  saving = signal(false);
  busy = signal(false);
  error = signal(false);
  comparison = signal<BasketComparisonDetail | null>(null);
  savedList = signal<BasketComparisonListItem[]>([]);
  commerces = signal<Commerce[]>([]);
  overrideDrafts = signal<Record<string, string>>({});
  linkDialog = signal<LinkDialogState | null>(null);
  pickerOpen = signal(false);
  compareCommerceIds = computed(() => {
    const detail = this.comparison();
    if (!detail) return [];
    const base = detail.baseCommerceId;
    return detail.commerceIds.filter((id) => id !== base);
  });

  ngOnInit(): void {
    this.commerceRepo.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => this.commerces.set(list),
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      this.loadInitial(id);
    });
  }

  commerceName(commerceId: string): string {
    return this.commerces().find((c) => c.id === commerceId)?.name ?? commerceId;
  }

  commerceCurrency(commerceId: string): string {
    return this.commerces().find((c) => c.id === commerceId)?.currencyCode ?? '';
  }

  cellFor(line: BasketComparisonLine, commerceId: string): BasketComparisonPriceCell | null {
    return line.prices.find((p) => p.commerceId === commerceId) ?? null;
  }

  formatMoney(amount: string | null, commerceId: string): string {
    if (amount == null || amount === '') return '—';
    const n = Number(amount);
    if (!Number.isFinite(n)) return amount;
    return formatPrice(n, this.commerceCurrency(commerceId));
  }

  formatQty(quantity: string): string {
    const n = Number(quantity);
    if (!Number.isFinite(n)) return quantity;
    return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }

  overrideKey(lineId: string, commerceId: string): string {
    return `${lineId}:${commerceId}`;
  }

  overrideValue(lineId: string, commerceId: string, cell: BasketComparisonPriceCell | null): string {
    const key = this.overrideKey(lineId, commerceId);
    const draft = this.overrideDrafts()[key];
    if (draft !== undefined) return draft;
    return cell?.overridePrice ?? cell?.effectivePrice ?? '';
  }

  onOverrideInput(lineId: string, commerceId: string, value: string): void {
    this.overrideDrafts.update((drafts) => ({ ...drafts, [this.overrideKey(lineId, commerceId)]: value }));
  }

  isCommerceSelected(commerceId: string): boolean {
    return this.comparison()?.commerceIds.includes(commerceId) ?? false;
  }

  isBaseCommerce(commerceId: string): boolean {
    return this.comparison()?.baseCommerceId === commerceId;
  }

  toggleCommerce(commerceId: string, checked: boolean): void {
    const detail = this.comparison();
    if (!detail || !detail.baseCommerceId) return;
    if (commerceId === detail.baseCommerceId) return;
    let next = [...detail.commerceIds];
    if (checked) {
      if (!next.includes(commerceId)) next = [...next, commerceId];
    } else {
      next = next.filter((id) => id !== commerceId);
    }
    if (!next.includes(detail.baseCommerceId)) {
      next = [detail.baseCommerceId, ...next];
    }
    if (next.length < 2) {
      this.toast.error(this.i18n.t('basketCompareMinCommerces'));
      return;
    }
    this.applyCommerceIds(detail, next);
  }

  saveCurrent(): void {
    const detail = this.comparison();
    if (!detail || detail.status !== 'current') {
      this.toast.error(this.i18n.t('basketCompareSaveCurrentOnly'));
      return;
    }
    const name = window.prompt(this.i18n.t('basketCompareSavePrompt'))?.trim();
    if (!name) return;
    this.busy.set(true);
    this.repo
      .saveFromCurrent({ name, fromCurrent: true })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(this.i18n.t('basketCompareSaveSuccess'));
          this.refreshSavedList();
        },
        error: () => this.toast.error(this.i18n.t('basketCompareSaveError')),
      });
  }

  openSaved(item: BasketComparisonListItem): void {
    void this.router.navigate(['/basket-comparisons'], { queryParams: { id: item.id } });
  }

  openCurrent(): void {
    void this.router.navigate(['/basket-comparisons'], { queryParams: {} });
  }

  async deleteSaved(item: BasketComparisonListItem): Promise<void> {
    const confirmed = await this.confirm.confirm(
      this.i18n.t('basketCompareDeleteConfirm').replace('{name}', item.name || item.id),
      {
        title: this.i18n.t('delete'),
        confirmLabel: this.i18n.t('delete'),
        variant: 'danger',
      },
    );
    if (!confirmed) return;
    this.busy.set(true);
    this.repo
      .delete(item.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.toast.success(this.i18n.t('basketCompareDeleted'));
          if (this.comparison()?.id === item.id) {
            this.openCurrent();
          } else {
            this.refreshSavedList();
          }
        },
        error: () => this.toast.error(this.i18n.t('basketCompareDeleteError')),
      });
  }

  async loadToCart(item?: BasketComparisonListItem | BasketComparisonDetail): Promise<void> {
    const target = item ?? this.comparison();
    if (!target) return;
    const confirmed = await this.confirm.confirm(this.i18n.t('basketCompareLoadToCartConfirm'), {
      title: this.i18n.t('basketCompareLoadToCart'),
      confirmLabel: this.i18n.t('basketCompareLoadToCart'),
      variant: 'danger',
    });
    if (!confirmed) return;
    this.busy.set(true);
    this.repo
      .loadToCart(target.id)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (draft) => {
          this.cart.replaceFromDraft(draft);
          this.toast.success(this.i18n.t('basketCompareLoadedToCart'));
          void this.router.navigate(['/cart']);
        },
        error: () => this.toast.error(this.i18n.t('basketCompareLoadToCartError')),
      });
  }

  openLinkDialog(lineId: string, commerceId: string): void {
    this.linkDialog.set({ lineId, commerceId });
  }

  closeLinkDialog(): void {
    this.linkDialog.set(null);
  }

  onProductLinked(product: Product): void {
    const dialog = this.linkDialog();
    const detail = this.comparison();
    if (!dialog || !detail) return;
    this.linkDialog.set(null);
    this.busy.set(true);
    this.repo
      .setPrice(detail.id, dialog.lineId, {
        commerceId: dialog.commerceId,
        mode: 'linked',
        linkedProductId: product.apiId,
      })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.comparison.set(updated);
          this.toast.success(this.i18n.t('basketComparePriceLinked'));
        },
        error: () => this.toast.error(this.i18n.t('basketComparePriceError')),
      });
  }

  startOverride(lineId: string, commerceId: string, cell: BasketComparisonPriceCell | null): void {
    const key = this.overrideKey(lineId, commerceId);
    this.overrideDrafts.update((drafts) => ({
      ...drafts,
      [key]: cell?.overridePrice ?? '',
    }));
  }

  saveOverride(lineId: string, commerceId: string): void {
    const detail = this.comparison();
    if (!detail) return;
    const raw = this.overrideDrafts()[this.overrideKey(lineId, commerceId)]?.trim() ?? '';
    const normalized = raw.replace(',', '.');
    const amount = Number(normalized);
    if (!normalized || !Number.isFinite(amount) || amount < 0) {
      this.toast.error(this.i18n.t('basketCompareInvalidPrice'));
      return;
    }
    const overridePrice = amount.toFixed(2);
    this.busy.set(true);
    this.repo
      .setPrice(detail.id, lineId, {
        commerceId,
        mode: 'override',
        overridePrice,
      })
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.comparison.set(updated);
          this.overrideDrafts.update((drafts) => {
            const next = { ...drafts };
            delete next[this.overrideKey(lineId, commerceId)];
            return next;
          });
          this.toast.success(this.i18n.t('basketComparePriceSaved'));
        },
        error: () => this.toast.error(this.i18n.t('basketComparePriceError')),
      });
  }

  clearPrice(lineId: string, commerceId: string): void {
    const detail = this.comparison();
    if (!detail) return;
    this.busy.set(true);
    this.repo
      .clearPrice(detail.id, lineId, commerceId)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (updated) => {
          this.comparison.set(updated);
          this.toast.success(this.i18n.t('basketComparePriceCleared'));
        },
        error: () => this.toast.error(this.i18n.t('basketComparePriceError')),
      });
  }

  reload(): void {
    const id = this.route.snapshot.queryParamMap.get('id');
    this.loadInitial(id);
  }

  private loadInitial(id: string | null): void {
    this.loading.set(true);
    this.error.set(false);
    this.refreshSavedList();
    const request$ = id ? this.repo.get(id) : this.repo.getCurrent();
    request$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (detail) => this.comparison.set(detail),
      error: () => {
        this.error.set(true);
        this.comparison.set(null);
      },
    });
  }

  private refreshSavedList(): void {
    this.repo.list().subscribe({
      next: (items) =>
        this.savedList.set(items.filter((item) => item.status !== 'current')),
      error: () => this.savedList.set([]),
    });
  }

  private applyCommerceIds(detail: BasketComparisonDetail, commerceIds: string[]): void {
    this.saving.set(true);
    const request$ =
      detail.status === 'current'
        ? this.repo.updateCurrent({ commerceIds })
        : this.repo.patch(detail.id, { commerceIds });
    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (updated) => this.comparison.set(updated),
      error: () => this.toast.error(this.i18n.t('basketCompareCommerceUpdateError')),
    });
  }
}
