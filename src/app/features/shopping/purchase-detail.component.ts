import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Purchase } from './purchase.repository';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-purchase-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './purchase-detail.component.html',
  styleUrl: './purchase-detail.component.scss',
})
export class PurchaseDetailComponent {
  router = inject(Router);
  i18n = inject(I18nService);
  purchase: Purchase | null = null;

  constructor() {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.purchase = navigation.extras.state['purchase'];
    }
  }

  back() {
    this.router.navigate(['/purchases']);
  }
}
