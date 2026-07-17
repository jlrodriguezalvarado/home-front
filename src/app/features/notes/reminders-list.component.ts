import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService } from '../../shared/services/toast.service';
import { Reminder } from './notes.models';
import { NotesNavComponent } from './notes-nav.component';
import { NotesRepository } from './notes.repository';

@Component({
  selector: 'app-reminders-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NotesNavComponent],
  template: `
    <div class="space-y-lg">
      <app-notes-nav></app-notes-nav>
      <div class="flex flex-wrap items-center justify-between gap-md">
        <h1 class="page-title">{{ i18n.t('reminders') }}</h1>
        <a routerLink="/notes/reminders/create" class="btn-primary flex items-center gap-2"><span class="material-symbols-outlined">add_alarm</span>{{ i18n.t('newReminder') }}</a>
      </div>
      <div *ngIf="loading()" class="text-center p-lg">{{ i18n.t('processing') }}</div>
      <div *ngIf="!loading() && reminders().length === 0" class="card-surface p-xl text-center text-on-surface-variant">{{ i18n.t('noReminders') }}</div>
      <div class="space-y-md">
        <article *ngFor="let reminder of reminders()" class="card-surface p-lg flex flex-col md:flex-row md:items-center gap-md">
          <span class="material-symbols-outlined text-primary text-[30px]">alarm</span>
          <div class="flex-1 min-w-0">
            <h2 class="text-title-lg">{{ reminder.title || reminder.noteTitle || i18n.t('reminder') }}</h2>
            <p class="text-body-md text-on-surface-variant">{{ formatDate(reminder.scheduledAt) }} · {{ recurrenceLabel(reminder.recurrence) }}</p>
            <p class="text-label-md text-on-surface-variant">{{ channelLabel(reminder) }}</p>
          </div>
          <span class="text-label-md px-sm py-xs rounded-full bg-surface-container">{{ statusLabel(reminder.status) }}</span>
          <a [routerLink]="['/notes/reminders', reminder.id, 'edit']" class="btn-secondary">{{ i18n.t('edit') }}</a>
          <button type="button" (click)="remove(reminder)" class="text-error px-sm">{{ i18n.t('delete') }}</button>
        </article>
      </div>
    </div>
  `,
})
export class RemindersListComponent implements OnInit {
  private readonly repo = inject(NotesRepository);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  i18n = inject(I18nService);
  reminders = signal<Reminder[]>([]);
  loading = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.repo.listReminders().subscribe({
      next: reminders => {
        this.reminders.set(reminders);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  formatDate(value: string) {
    return new Intl.DateTimeFormat(this.i18n.lang(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  recurrenceLabel(value: Reminder['recurrence']) {
    return this.i18n.t(value === 'none' ? 'doesNotRepeat' : value);
  }

  statusLabel(value: Reminder['status']) {
    return this.i18n.t(value);
  }

  channelLabel(reminder: Reminder) {
    const channels = [
      reminder.notifyInApp ? this.i18n.t('inApp') : '',
      reminder.notifyPush ? this.i18n.t('push') : '',
      reminder.notifyEmail ? this.i18n.t('email') : '',
    ].filter(Boolean);
    return channels.join(' · ');
  }

  async remove(reminder: Reminder) {
    const confirmed = await this.confirm.confirm(this.i18n.t('deleteReminderConfirm'), { variant: 'danger', confirmLabel: this.i18n.t('delete') });
    if (!confirmed) return;
    this.repo.deleteReminder(reminder.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('delete'));
        this.load();
      },
    });
  }
}
