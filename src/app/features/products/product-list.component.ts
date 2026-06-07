import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductRepository } from './product.repository';
import { CartService } from '../shopping/cart.service';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';
import { CommerceRepository } from '../commerce/commerce.repository';
import { Product, Category, Commerce } from '../../core/api/models';
import { I18nService } from '../../core/i18n/i18n.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
        <h1 class="text-3xl font-bold">{{ i18n.t('products') }}</h1>
        <div class="flex flex-1 max-w-md w-full">
          <input type="text" [placeholder]="i18n.t('search')"
                 [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange($event)"
                 class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-dark-surface outline-none focus:ring-2 focus:ring-primary">
        </div>
      </div>

      <div class="flex gap-4 overflow-x-auto pb-2">
        <select [(ngModel)]="selectedCommerce" (change)="loadProducts(true)"
                class="px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-dark-surface">
          <option value="">{{ i18n.t('commerces') }}</option>
          <option *ngFor="let c of commerces()" [value]="c.id">{{ c.name }}</option>
        </select>

        <select [(ngModel)]="selectedCategory" (change)="loadProducts(true)"
                class="px-4 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-dark-surface">
          <option value="">{{ i18n.t('category') }}</option>
          <option *ngFor="let cat of categories()" [value]="cat.id">{{ cat.name }}</option>
        </select>
      </div>

      <app-loading-state *ngIf="loading() && products().length === 0"></app-loading-state>
      <app-error-state *ngIf="error()" (retry)="loadProducts(true)"></app-error-state>
      <app-empty-state *ngIf="!loading() && !error() && products().length === 0" icon="📦"></app-empty-state>

      <div *ngIf="products().length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div *ngFor="let product of products()" class="bg-white dark:bg-dark-surface rounded-xl shadow-sm border dark:border-gray-800 overflow-hidden flex flex-col">
          <div class="aspect-square bg-gray-100 dark:bg-gray-800 relative">
            <img *ngIf="product.image" [src]="product.image" class="w-full h-full object-cover">
            <div *ngIf="!product.image" class="w-full h-full flex items-center justify-center text-gray-400">No image</div>
          </div>
          <div class="p-3 flex-1 flex flex-col">
            <div class="text-xs text-gray-500">{{ product.commerce.name }}</div>
            <div class="font-bold text-sm truncate">{{ product.name }}</div>
            <div class="mt-auto pt-2 flex items-center justify-between">
              <div class="text-primary font-bold">{{ product.price }} <small>{{ product.commerce.currencyCode }}</small></div>
              <button (click)="cartService.addToCart(product)" class="p-2 bg-primary text-white rounded-lg hover:bg-secondary">
                <span class="text-xs">+</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="hasMore()" class="flex justify-center py-8">
        <button (click)="loadMore()" [disabled]="loading()" class="px-6 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700">
          {{ loading() ? '...' : 'Load more' }}
        </button>
      </div>
    </div>
  `
})
export class ProductListComponent implements OnInit {
  repo = inject(ProductRepository);
  commerceRepo = inject(CommerceRepository);
  cartService = inject(CartService);
  i18n = inject(I18nService);

  products = signal<Product[]>([]);
  commerces = signal<Commerce[]>([]);
  categories = signal<Category[]>([]);

  searchQuery = '';
  selectedCommerce = '';
  selectedCategory = '';

  currentPage = 1;
  loading = signal(false);
  error = signal(false);
  hasMore = signal(false);

  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.loadProducts();
    this.loadFilters();

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => this.loadProducts(true));
  }

  onSearchChange(query: string) {
    this.searchSubject.next(query);
  }

  loadFilters() {
    this.commerceRepo.list().subscribe(res => this.commerces.set(res));
    this.repo.getCategories().subscribe(res => this.categories.set(res));
  }

  loadProducts(reset = false) {
    if (reset) {
      this.currentPage = 1;
      this.products.set([]);
    }

    this.loading.set(true);
    this.error.set(false);
    this.repo.list({
      search: this.searchQuery,
      commerce: this.selectedCommerce,
      category: this.selectedCategory,
      page: this.currentPage
    }).subscribe({
      next: (res) => {
        this.products.update((prev) => [...prev, ...res.results]);
        this.hasMore.set(!!res.next);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  loadMore() {
    this.currentPage++;
    this.loadProducts();
  }
}
