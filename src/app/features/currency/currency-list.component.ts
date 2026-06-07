import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CurrencyRepository, Currency } from './currency.repository';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-currency-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-3xl font-bold">{{ i18n.t('currencies') }}</h1>
        <button (click)="openDialog()" class="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-secondary">
          Add Currency
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div *ngFor="let c of currencies()" class="bg-white dark:bg-dark-surface p-6 rounded-2xl shadow-sm border dark:border-gray-800">
          <div class="flex justify-between items-start">
            <div>
              <div class="text-2xl font-bold">{{ c.code }}</div>
              <div class="text-gray-500">{{ c.name }}</div>
            </div>
            <div class="text-right">
               <div class="text-2xl">{{ c.symbol }}</div>
               <div class="mt-4 flex gap-2">
                 <button (click)="openDialog(c)" class="text-blue-500 text-sm">Edit</button>
                 <button (click)="deleteCurrency(c.code)" class="text-red-500 text-sm">Delete</button>
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Simple Modal for Add/Edit -->
      <div *ngIf="showDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div class="bg-white dark:bg-dark-surface w-full max-w-md p-8 rounded-2xl">
          <h2 class="text-xl font-bold mb-6">{{ editingCode ? 'Edit' : 'Add' }} Currency</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm mb-1">Code</label>
              <input type="text" [(ngModel)]="form.code" [disabled]="!!editingCode" class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent uppercase">
            </div>
            <div>
              <label class="block text-sm mb-1">Name</label>
              <input type="text" [(ngModel)]="form.name" class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent">
            </div>
            <div>
              <label class="block text-sm mb-1">Symbol</label>
              <input type="text" [(ngModel)]="form.symbol" class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent">
            </div>
            <div class="flex gap-4 pt-4">
               <button (click)="closeDialog()" class="flex-1 py-2 border dark:border-gray-700 rounded-lg">Cancel</button>
               <button (click)="save()" class="flex-1 py-2 bg-primary text-white font-bold rounded-lg">Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CurrencyListComponent implements OnInit {
  repo = inject(CurrencyRepository);
  i18n = inject(I18nService);
  currencies = signal<Currency[]>([]);

  showDialog = false;
  editingCode: string | null = null;
  form = { code: '', name: '', symbol: '', active: true };

  ngOnInit() {
    this.load();
  }

  load() {
    this.repo.list().subscribe(res => this.currencies.set(res));
  }

  openDialog(c?: Currency) {
    if (c) {
      this.editingCode = c.code;
      this.form = { ...c };
    } else {
      this.editingCode = null;
      this.form = { code: '', name: '', symbol: '', active: true };
    }
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
  }

  save() {
    if (this.editingCode) {
      this.repo.update(this.editingCode, this.form).subscribe(() => {
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

  deleteCurrency(code: string) {
    if (!confirm(`Delete currency ${code}?`)) return;
    this.repo.delete(code).subscribe(() => this.load());
  }
}
