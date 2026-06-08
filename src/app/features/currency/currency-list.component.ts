import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyRepository } from './currency.repository';
import { Currency } from '../../core/api/models';
import { I18nService } from '../../core/i18n/i18n.service';
import { ConfirmService } from '../../shared/services/confirm.service';

@Component({
  selector: 'app-currency-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './currency-list.component.html',
  styleUrl: './currency-list.component.scss',
})
export class CurrencyListComponent implements OnInit {
  repo = inject(CurrencyRepository);
  i18n = inject(I18nService);
  confirm = inject(ConfirmService);
  currencies = signal<Currency[]>([]);

  showDialog = false;
  editingId: string | null = null;
  form = { code: '', name: '', symbol: '', active: true };

  ngOnInit() {
    this.load();
  }

  load() {
    this.repo.list().subscribe(res => this.currencies.set(res));
  }

  openDialog(c?: Currency) {
    if (c) {
      this.editingId = c.id;
      this.form = { code: c.code, name: c.name, symbol: c.symbol, active: c.active };
    } else {
      this.editingId = null;
      this.form = { code: '', name: '', symbol: '', active: true };
    }
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
  }

  save() {
    if (this.editingId) {
      this.repo.update(this.editingId, this.form).subscribe(() => {
        this.load();
        this.closeDialog();
      });
    } else {
      this.repo.create(this.form).subscribe(() => {
        this.load();
        this.closeDialog();
      });
    }
  }

  async deleteCurrency(c: Currency) {
    const message =
      this.i18n.lang() === 'en'
        ? `Delete currency ${c.code}?`
        : `¿Eliminar la divisa ${c.code}?`;
    const confirmed = await this.confirm.confirm(message, {
      variant: 'danger',
      confirmLabel: this.i18n.t('delete'),
    });
    if (!confirmed) return;
    this.repo.delete(c.id).subscribe(() => this.load());
  }
}
