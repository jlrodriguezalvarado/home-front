import { Component, inject, OnInit, signal, computed } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { ProductRepository } from './product.repository';

import { ProductFilterStorageService } from './product-filter-storage.service';

import { CartService } from '../shopping/cart.service';

import { LoadingStateComponent } from '../../shared/components/loading-state.component';

import { EmptyStateComponent } from '../../shared/components/empty-state.component';

import { ErrorStateComponent } from '../../shared/components/error-state.component';

import { CommerceRepository } from '../commerce/commerce.repository';

import { Product, Category, Commerce } from '../../core/api/models';

import { I18nService } from '../../core/i18n/i18n.service';

import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { QuantityEditorComponent } from '../../shared/components/quantity-editor.component';

import { formatUnitPrice } from '../shopping/utils/price.utils';



@Component({

  selector: 'app-product-list',

  standalone: true,

  imports: [

    CommonModule,

    FormsModule,

    LoadingStateComponent,

    EmptyStateComponent,

    ErrorStateComponent,

    QuantityEditorComponent,

  ],

  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
})

export class ProductListComponent implements OnInit {

  repo = inject(ProductRepository);

  commerceRepo = inject(CommerceRepository);

  filterStorage = inject(ProductFilterStorageService);

  cartService = inject(CartService);

  i18n = inject(I18nService);



  products = signal<Product[]>([]);

  commerces = signal<Commerce[]>([]);

  categories = signal<Category[]>([]);



  searchDraft = '';

  debouncedSearch = '';

  selectedCommerceId: string | null = null;

  selectedCategoryId: string | null = null;



  loading = signal(false);

  error = signal(false);

  hasMore = signal(false);



  private nextUrl: string | null = null;

  private generation = 0;

  private searchSubject = new Subject<string>();



  cartQuantities = computed(() => this.cartService.cartQuantitiesByProductId());



  get allCategoriesLabel(): string {

    return this.i18n.lang() === 'en' ? 'All' : 'Todas';

  }



  ngOnInit() {

    const saved = this.filterStorage.load();

    if (saved) {

      this.selectedCommerceId = saved.commerceId;

      this.selectedCategoryId = saved.categoryId;

      this.searchDraft = saved.search;

      this.debouncedSearch = saved.search;

    }



    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe((query) => {

      this.debouncedSearch = query;

      this.persistFilters();

      this.reloadProducts();

    });



    this.commerceRepo.list().subscribe({

      next: (res) => {

        this.commerces.set(res);

        if (this.selectedCommerceId && !res.some((c) => c.id === this.selectedCommerceId)) {

          this.selectedCommerceId = null;

        }

        if (!this.selectedCommerceId && res.length > 0) {

          this.selectedCommerceId = res[0].id;

        }

        this.loadCategoriesForSelectedCommerce();

      },

      error: () => {

        this.error.set(true);

      },

    });

  }



  onSearchChange(query: string) {

    this.searchSubject.next(query);

  }



  onCommerceChange(commerceId: string) {

    this.selectedCommerceId = commerceId;

    this.persistFilters();

    this.loadCategoriesForSelectedCommerce();

  }



  onCategoryChange(categoryId: string | null) {

    this.selectedCategoryId = categoryId || null;

    this.persistFilters();

    this.reloadProducts();

  }



  qtyInCart(productId: number): number {

    return this.cartQuantities().get(productId) ?? 0;

  }



  onSetQuantity(productId: number, quantity: number) {
    this.cartService.setQuantity(productId, quantity);
  }

  addToCart(product: Product) {
    const commerceId = product.commerceId || this.selectedCommerceId || '';
    const snapshot =
      commerceId && product.commerceId !== commerceId
        ? { ...product, commerceId }
        : product;
    this.cartService.addProduct(snapshot);
  }



  commerceName(commerceId: string): string {

    return this.commerces().find((c) => c.id === commerceId)?.name ?? '';

  }



  unitPriceLabel(product: Product): string {

    return formatUnitPrice(product);

  }



  reloadProducts() {

    this.loadProducts(true);

  }



  loadMore() {

    if (!this.nextUrl || this.loading()) return;

    this.loadProducts(false);

  }



  private loadCategoriesForSelectedCommerce(): void {

    if (!this.selectedCommerceId) {

      this.categories.set([]);

      return;

    }



    const commerceId = this.selectedCommerceId;



    this.repo.getCategories({ commerce_id: commerceId }).subscribe({

      next: (res) => {

        if (commerceId !== this.selectedCommerceId) return;



        this.categories.set(res);



        if (this.selectedCategoryId && !res.some((c) => c.id === this.selectedCategoryId)) {

          this.selectedCategoryId = null;

        }



        this.persistFilters();

        this.reloadProducts();

      },

      error: () => {

        if (commerceId !== this.selectedCommerceId) return;



        this.categories.set([]);

        this.error.set(true);

      },

    });

  }



  private persistFilters(): void {

    this.filterStorage.save({

      commerceId: this.selectedCommerceId,

      categoryId: this.selectedCategoryId,

      search: this.searchDraft,

    });

  }



  private loadProducts(reset: boolean) {

    if (!this.selectedCommerceId) return;



    const gen = ++this.generation;



    if (reset) {

      this.products.set([]);

      this.nextUrl = null;

      this.hasMore.set(false);

    }



    this.loading.set(true);

    this.error.set(false);



    const request$ =

      reset || !this.nextUrl

        ? this.repo.list({

            search: this.debouncedSearch || undefined,

            commerce_id: this.selectedCommerceId,

            category_id: this.selectedCategoryId || undefined,

            page: 1,

            perPage: 20,

          })

        : this.repo.listByNextUrl(this.nextUrl);



    request$.subscribe({

      next: (res) => {

        if (gen !== this.generation) return;

        this.products.update((prev) => [...prev, ...res.results]);

        this.nextUrl = res.next;

        this.hasMore.set(!!res.next);

        this.loading.set(false);

      },

      error: () => {

        if (gen !== this.generation) return;

        this.loading.set(false);

        this.error.set(true);

      },

    });

  }

}

