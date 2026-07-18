import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExchangeRepository, ExchangeRate } from './exchange.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { Decimal } from 'decimal.js';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-exchange-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exchange-dashboard.component.html',
  styleUrl: './exchange-dashboard.component.scss',
})
export class ExchangeDashboardComponent implements OnInit {
  repo = inject(ExchangeRepository);
  i18n = inject(I18nService);
  toast = inject(ToastService);

  rates = signal<ExchangeRate[]>([]);
  amount = 1;
  from = 'USD';
  to = 'EUR';
  notes = '';

  result = signal('0');

  ngOnInit() {
    this.repo.list().subscribe({
      next: (res) => {
        this.rates.set(this.repo.getLatestActive(res));
        this.calculate();
      },
      error: () => this.rates.set([]),
    });
  }

  calculate() {
    const rateObj = this.rates().find(r => r.from_currency.toUpperCase() === this.from.toUpperCase() && r.to_currency.toUpperCase() === this.to.toUpperCase());
    if (rateObj) {
      this.result.set(new Decimal(this.amount).mul(new Decimal(rateObj.rate)).toFixed(2));
    } else {
      this.result.set('---');
    }
  }

  swap() {
    const temp = this.from;
    this.from = this.to;
    this.to = temp;
    this.calculate();
  }

  canSave() {
    return this.result() !== '---' && this.amount > 0;
  }

  saveExchange() {
    const rateObj = this.rates().find(r => r.from_currency.toUpperCase() === this.from.toUpperCase() && r.to_currency.toUpperCase() === this.to.toUpperCase());
    if (!rateObj) return;

    this.repo.create({
      from_currency: this.from.toUpperCase(),
      to_currency: this.to.toUpperCase(),
      rate: rateObj.rate,
      effective_date: new Date().toISOString().split('T')[0],
      is_active: true,
    }).subscribe({
      next: () => {
        this.toast.success('Exchange saved');
        this.notes = '';
      },
      error: () => this.toast.error('Error saving exchange'),
    });
  }
}
