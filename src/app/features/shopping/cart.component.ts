import { Component, effect, inject, OnInit, computed, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { CartService } from './cart.service';

import { PurchaseRepository } from './purchase.repository';

import { I18nService } from '../../core/i18n/i18n.service';

import { Router } from '@angular/router';

import { CommerceRepository } from '../commerce/commerce.repository';
import { ProductFilterStorageService } from '../products/product-filter-storage.service';

import { Commerce } from '../../core/api/models';

import { CartItem } from '../../core/models/shopping.models';

import { QuantityEditorComponent } from '../../shared/components/quantity-editor.component';

import {

  formatPrice,

  formatUnitPrice,

  lineTotal,

  moneyDecimalString,

  quantityStringForPurchase,

} from './utils/price.utils';

import { isPresentationUnitKg } from './utils/presentation-unit.utils';
import { formatCartListMessage } from './utils/cart-list-message.utils';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';



@Component({

  selector: 'app-cart',

  standalone: true,

  imports: [CommonModule, FormsModule, QuantityEditorComponent],

  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})

export class CartComponent implements OnInit {

  cart = inject(CartService);

  i18n = inject(I18nService);

  purchaseRepo = inject(PurchaseRepository);

  commerceRepo = inject(CommerceRepository);

  productFilter = inject(ProductFilterStorageService);

  router = inject(Router);
  toast = inject(ToastService);
  confirm = inject(ConfirmService);



  commerces = signal<Commerce[]>([]);

  filterCommerceId = signal<string | null>(null);



  commerceIds = computed(() => this.cart.commerceIds());

  sortedCommerceIds = computed(() => {
    const ids = this.commerceIds();
    const commerces = this.commerces();
    return [...ids].sort((a, b) => {
      const nameA = commerces.find((c) => c.id === a)?.name ?? a;
      const nameB = commerces.find((c) => c.id === b)?.name ?? b;
      return nameA.localeCompare(nameB);
    });
  });

  visibleItems = computed(() => {
    const id = this.filterCommerceId();
    if (id == null) return [];
    return this.itemsForCommerce(id);
  });

  itemsForCommerce(commerceId: string): CartItem[] {
    return this.cart.itemsByCommerce()[commerceId] ?? [];
  }



  visibleCount = computed(() => this.cart.visibleQuantityCountFor(this.visibleItems()));



  isPresentationUnitKg = isPresentationUnitKg;

  formatUnitPrice = formatUnitPrice;



  constructor() {
    effect(() => {
      const ids = this.cart.commerceIds();
      if (ids.length === 0) {
        this.filterCommerceId.set(null);
        return;
      }
      const current = this.filterCommerceId();
      if (current == null || !ids.includes(current)) {
        this.applyDefaultCommerceFilter();
      }
    });
  }

  ngOnInit() {
    this.commerceRepo.list().subscribe((res) => {
      this.commerces.set(res);
      this.repairAndApplyCommerceFilter();
    });
    this.repairAndApplyCommerceFilter();
  }

  private repairAndApplyCommerceFilter(): void {
    const productCommerceId = this.productFilter.load()?.commerceId ?? null;
    this.cart.repairMissingCommerceIds(productCommerceId);
    this.applyDefaultCommerceFilter();
  }

  private applyDefaultCommerceFilter(): void {
    const ids = this.cart.commerceIds();
    if (ids.length === 0) {
      this.filterCommerceId.set(null);
      return;
    }
    const effective = this.cart.resolveEffectiveFilterCommerceId();
    this.filterCommerceId.set(effective);
  }



  onFilterCommerceChange(commerceId: string) {

    this.filterCommerceId.set(commerceId);

    this.cart.setFilterCommerceId(commerceId);

  }



  commerceName(commerceId: string): string {
    const trimmed = commerceId?.trim();
    if (!trimmed) return '';
    return this.commerces().find((c) => c.id === trimmed)?.name ?? trimmed;
  }

  commerceCurrency(commerceId: string): string {
    return this.commerces().find((c) => c.id === commerceId)?.currencyCode ?? '';
  }

  resolveCurrency(items: CartItem[], commerceId: string): string {
    return this.cart.visibleTotalCurrency(items) ?? this.commerceCurrency(commerceId);
  }

  formatLineTotal(item: CartItem): string {
    const currency =
      item.product.originalCurrency || this.commerceCurrency(item.product.commerceId);
    return formatPrice(lineTotal(item), currency);
  }

  formatSubtotal(items: CartItem[], commerceId: string): string {
    const total = this.cart.visibleTotal(items);
    return formatPrice(total, this.resolveCurrency(items, commerceId));
  }

  formatFooterTotal(): string {
    const commerceId = this.filterCommerceId();
    const items = this.visibleItems();
    const total = this.cart.visibleTotal(items);
    const currency = commerceId ? this.resolveCurrency(items, commerceId) : '';
    return formatPrice(total, currency);
  }

  async confirmPurchase() {
    const items = this.visibleItems();
    if (items.length === 0) return;

    const confirmed = await this.confirm.confirm(`${this.i18n.t('confirmPurchase')}?`, {
      confirmLabel: this.i18n.t('confirmPurchase'),
    });
    if (!confirmed) return;

    const commerceId = this.filterCommerceId()!;

    const data = {

      commerce: commerceId,

      items: items.map((i) => ({

        product: i.product.apiId,

        quantity: quantityStringForPurchase(i.quantity, i.product.presentationUnit),

        price: moneyDecimalString(i.product.originalPrice),

      })),

    };



    this.purchaseRepo.create(data).subscribe({

      next: () => {

        this.cart.removeProducts(items.map((i) => i.product.id));

        if (this.cart.items().length === 0) {

          this.filterCommerceId.set(null);

          this.cart.setFilterCommerceId(null);

        } else {

          this.filterCommerceId.set(this.cart.resolveEffectiveFilterCommerceId());

        }

        this.router.navigate(['/purchases']);

      },

      error: () =>
        this.toast.error(
          this.i18n.lang() === 'en' ? 'Error creating purchase' : 'Error al crear la compra',
        ),

    });

  }



  private formatMessage(): string {
    return formatCartListMessage(this.visibleItems());
  }



  copyMessage() {

    navigator.clipboard.writeText(this.formatMessage()).then(() =>
      this.toast.success(
        this.i18n.lang() === 'en' ? 'Message copied to clipboard' : 'Mensaje copiado',
      ),
    );

  }



  sendWhatsApp() {
    const msg = encodeURIComponent(this.formatMessage());
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }

  async clearCart() {
    if (this.cart.items().length === 0) return;

    const confirmed = await this.confirm.confirm(this.i18n.t('clearCartConfirm'), {
      title: this.i18n.t('clearCart'),
      confirmLabel: this.i18n.t('clearCart'),
      variant: 'danger',
    });
    if (!confirmed) return;

    this.cart.clearCart();
    this.filterCommerceId.set(null);
    this.cart.setFilterCommerceId(null);
    this.toast.success(this.i18n.t('cartCleared'));
  }
}

