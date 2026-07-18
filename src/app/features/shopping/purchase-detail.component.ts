import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  enrichPurchaseCommerceNames,
  Purchase,
  PurchaseRepository,
} from './purchase.repository';
import { CommerceRepository } from '../commerce/commerce.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { formatPrice } from './utils/price.utils';
import { LoadingStateComponent } from '../../shared/components/loading-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state.component';

@Component({
  selector: 'app-purchase-detail',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, ErrorStateComponent],
  templateUrl: './purchase-detail.component.html',
  styleUrl: './purchase-detail.component.scss',
})
export class PurchaseDetailComponent implements OnInit {
  router = inject(Router);
  route = inject(ActivatedRoute);
  repo = inject(PurchaseRepository);
  commerceRepo = inject(CommerceRepository);
  i18n = inject(I18nService);
  purchase: Purchase | null = null;
  loading = signal(false);
  error = signal(false);

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    const statePurchase = navigation?.extras.state?.['purchase'] as Purchase | undefined;
    if (statePurchase) {
      this.purchase = statePurchase;
      this.resolveCommerceNameIfNeeded(statePurchase);
      return;
    }
    const historyState = history.state?.['purchase'] as Purchase | undefined;
    if (historyState?.id) {
      this.purchase = historyState;
      this.resolveCommerceNameIfNeeded(historyState);
      return;
    }
    const id = this.route.snapshot.queryParamMap.get('id');
    if (!id) return;
    this.loadPurchase(id);
  }

  loadPurchase(id: string) {
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      purchase: this.repo.get(id),
      commerces: this.commerceRepo.list(),
    }).subscribe({
      next: ({ purchase, commerces }) => {
        const [enriched] = enrichPurchaseCommerceNames([purchase], commerces);
        this.purchase = enriched;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  lineTotalLabel(item: { quantity: number; price: number }): string {
    return formatPrice(item.quantity * item.price, this.purchase?.currency ?? '');
  }

  unitPriceLabel(price: number): string {
    return formatPrice(price, this.purchase?.currency ?? '');
  }

  back() {
    this.router.navigate(['/purchases']);
  }

  retryLoad() {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (id) this.loadPurchase(id);
  }

  private resolveCommerceNameIfNeeded(purchase: Purchase) {
    if (purchase.commerceName) return;
    this.commerceRepo.list().subscribe({
      next: (commerces) => {
        const [enriched] = enrichPurchaseCommerceNames([purchase], commerces);
        this.purchase = enriched;
      },
    });
  }
}
