import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FinanceRepository, FinanceEntry } from './finance.repository';

@Component({
  selector: 'app-finance-list-base',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold capitalize">{{ feature }}</h2>
        <button (click)="openDialog()" class="px-4 py-2 bg-primary text-white font-bold rounded-lg">Add Entry</button>
      </div>

      <div class="bg-white dark:bg-dark-surface rounded-2xl border dark:border-gray-800 divide-y dark:divide-gray-800">
        <div *ngFor="let item of entries()" class="p-4 flex justify-between items-center">
          <div class="flex-1 cursor-pointer" (click)="openDialog(item)">
            <div class="font-bold">{{ item.description }}</div>
            <div class="text-sm text-gray-500">{{ item.date | date }}</div>
          </div>
          <div class="flex items-center gap-4">
            <div class="font-bold" [class.text-red-500]="isExpense" [class.text-green-500]="!isExpense">{{ item.amount }}</div>
            <button (click)="deleteEntry(item.id)" class="text-red-500 text-sm">Delete</button>
          </div>
        </div>
        <div *ngIf="entries().length === 0" class="p-8 text-center text-gray-500">No entries</div>
      </div>

      <!-- Modal -->
      <div *ngIf="showDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div class="bg-white dark:bg-dark-surface w-full max-w-md p-8 rounded-2xl">
          <h2 class="text-xl font-bold mb-6">{{ editingId ? 'Edit' : 'Add' }} Entry</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm mb-1">Description</label>
              <input type="text" [(ngModel)]="form.description" class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent">
            </div>
            <div>
              <label class="block text-sm mb-1">Amount</label>
              <input type="number" [(ngModel)]="form.amount" class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent">
            </div>
            <div>
              <label class="block text-sm mb-1">Date</label>
              <input type="date" [(ngModel)]="form.date" class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent">
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
export class FinanceListBaseComponent implements OnInit {
  repo = inject(FinanceRepository);
  route = inject(ActivatedRoute);

  feature: string = '';
  isExpense: boolean = true;
  entries = signal<FinanceEntry[]>([]);
  year = '';
  month = '';

  showDialog = false;
  editingId: string | null = null;
  form = { description: '', amount: '', date: '' };

  ngOnInit() {
    this.route.parent?.params.subscribe(params => {
      this.year = params['year'];
      this.month = params['month'];
      this.load();
    });
  }

  load() {
    this.repo.listEntries(this.feature, this.year, this.month).subscribe(res => this.entries.set(res));
  }

  openDialog(item?: FinanceEntry) {
    if (item) {
      this.editingId = item.id;
      this.form = { ...item };
    } else {
      this.editingId = null;
      this.form = { description: '', amount: '', date: new Date().toISOString().split('T')[0] };
    }
    this.showDialog = true;
  }

  closeDialog() {
    this.showDialog = false;
  }

  save() {
    const data = { ...this.form, year: this.year, month: this.month };
    if (this.editingId) {
      this.repo.updateEntry(this.feature, this.editingId, data).subscribe(() => {
        this.load();
        this.closeDialog();
      });
    } else {
      this.repo.createEntry(this.feature, data).subscribe(() => {
        this.load();
        this.closeDialog();
      });
    }
  }

  deleteEntry(id: string) {
    if (!confirm('Are you sure?')) return;
    this.repo.deleteEntry(this.feature, id).subscribe(() => this.load());
  }
}
