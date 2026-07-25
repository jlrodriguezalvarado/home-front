import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  inject,
  input,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AppStringKey, I18nService } from '../../../../../core/i18n/i18n.service';
import { Product } from '../../../../../core/models/shopping.models';
import { ProductRepository } from '../../../../products/product.repository';
import { formatPrice } from '../../../utils/price.utils';
import { BasketComparisonRepository } from '../../basket-comparison.repository';

@Component({
  selector: 'app-product-link-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './product-link-dialog.component.html',
  styleUrl: './product-link-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ProductLinkDialogComponent implements OnInit {
  readonly comparisonId = input.required<string>();
  readonly lineId = input.required<string>();
  readonly commerceId = input.required<string>();
  readonly commerceName = input<string>('');
  @Output() selected = new EventEmitter<Product>();
  @Output() closed = new EventEmitter<void>();
  private readonly repo = inject(BasketComparisonRepository);
  private readonly productRepo = inject(ProductRepository);
  private readonly i18n = inject(I18nService);
  search = '';
  loading = signal(true);
  searching = signal(false);
  suggestions = signal<Product[]>([]);
  results = signal<Product[]>([]);
  error = signal(false);

  t(key: AppStringKey): string {
    return this.i18n.t(key);
  }

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    this.loadSuggestions();
  }

  close(): void {
    document.body.style.overflow = '';
    this.closed.emit();
  }

  onSearch(): void {
    const q = this.search.trim();
    if (!q) {
      this.results.set([]);
      return;
    }
    this.searching.set(true);
    this.productRepo
      .list({
        search: q,
        commerce_id: this.commerceId(),
        page: 1,
        perPage: 20,
      })
      .pipe(finalize(() => this.searching.set(false)))
      .subscribe({
        next: (page) => this.results.set(page.results),
        error: () => this.results.set([]),
      });
  }

  selectProduct(product: Product): void {
    document.body.style.overflow = '';
    this.selected.emit(product);
  }

  formatProductPrice(product: Product): string {
    return formatPrice(product.originalPrice, product.originalCurrency);
  }

  private loadSuggestions(): void {
    this.loading.set(true);
    this.error.set(false);
    this.repo
      .suggest(this.comparisonId(), this.lineId(), this.commerceId())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (suggestions) => this.suggestions.set(suggestions),
        error: () => {
          this.error.set(true);
          this.suggestions.set([]);
        },
      });
  }
}
