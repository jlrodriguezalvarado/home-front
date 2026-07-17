import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../shared/services/toast.service';
import { Note, ReminderPayload } from './notes.models';
import { NotesNavComponent } from './notes-nav.component';
import { NotesRepository } from './notes.repository';

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

@Component({
  selector: 'app-reminder-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NotesNavComponent],
  template: `
    <div class="space-y-lg">
      <app-notes-nav></app-notes-nav>
      <h1 class="page-title">{{ editingId() ? i18n.t('editReminder') : i18n.t('newReminder') }}</h1>
      <form [formGroup]="form" (ngSubmit)="save()" class="card-surface p-lg space-y-md max-w-3xl">
        <div>
          <label class="text-label-lg text-on-surface-variant block mb-xs">{{ i18n.t('note') }} ({{ i18n.t('optional') }})</label>
          <select formControlName="note" class="input-outlined"><option value="">—</option><option *ngFor="let note of notes()" [value]="note.id">{{ note.title || i18n.t('untitledNote') }}</option></select>
        </div>
        <div>
          <label class="text-label-lg text-on-surface-variant block mb-xs">{{ i18n.t('name') }} ({{ i18n.t('optional') }})</label>
          <input type="text" formControlName="title" class="input-outlined">
        </div>
        <div>
          <label class="text-label-lg text-on-surface-variant block mb-xs">{{ i18n.t('description') }}</label>
          <textarea formControlName="description" rows="4" class="input-outlined"></textarea>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-md">
          <div>
            <label class="text-label-lg text-on-surface-variant block mb-xs">{{ i18n.t('scheduledAt') }} *</label>
            <input type="datetime-local" formControlName="scheduledAt" class="input-outlined">
          </div>
          <div>
            <label class="text-label-lg text-on-surface-variant block mb-xs">{{ i18n.t('recurrence') }}</label>
            <select formControlName="recurrence" class="input-outlined">
              <option value="none">{{ i18n.t('doesNotRepeat') }}</option>
              <option value="daily">{{ i18n.t('daily') }}</option>
              <option value="weekly">{{ i18n.t('weekly') }}</option>
              <option value="monthly">{{ i18n.t('monthly') }}</option>
            </select>
          </div>
        </div>
        <fieldset class="space-y-sm">
          <legend class="text-label-lg text-on-surface-variant">{{ i18n.t('notificationChannels') }}</legend>
          <label class="flex items-center gap-sm"><input type="checkbox" formControlName="notifyInApp">{{ i18n.t('inApp') }}</label>
          <label class="flex items-center gap-sm"><input type="checkbox" formControlName="notifyPush">{{ i18n.t('push') }}</label>
          <label class="flex items-center gap-sm"><input type="checkbox" formControlName="notifyEmail">{{ i18n.t('email') }}</label>
        </fieldset>
        <div class="flex gap-md">
          <a routerLink="/notes/reminders" class="btn-secondary flex-1 text-center">{{ i18n.t('cancel') }}</a>
          <button type="submit" [disabled]="saving()" class="btn-primary flex-1">{{ i18n.t('save') }}</button>
        </div>
      </form>
    </div>
  `,
})
export class ReminderFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repo = inject(NotesRepository);
  private readonly toast = inject(ToastService);
  i18n = inject(I18nService);
  notes = signal<Note[]>([]);
  editingId = signal<string | null>(null);
  saving = signal(false);
  form = this.fb.nonNullable.group({
    note: '',
    title: '',
    description: '',
    scheduledAt: ['', Validators.required],
    recurrence: this.fb.nonNullable.control<ReminderPayload['recurrence']>('none'),
    notifyInApp: true,
    notifyPush: true,
    notifyEmail: false,
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.editingId.set(id);
    if (!id) {
      this.repo.listNotes({ is_archived: false }).subscribe(notes => this.notes.set(notes));
      return;
    }
    forkJoin({ notes: this.repo.listNotes({ is_archived: false }), reminder: this.repo.getReminder(id) }).subscribe({
      next: ({ notes, reminder }) => {
        this.notes.set(notes);
        this.form.patchValue({ ...reminder, note: reminder.note ?? '', scheduledAt: toLocalDateTime(reminder.scheduledAt) });
      },
      error: () => void this.router.navigate(['/notes/reminders']),
    });
  }

  save() {
    const value = this.form.getRawValue();
    if (this.form.invalid || (!value.note && !value.title.trim() && !value.description.trim())) {
      this.toast.error(this.i18n.t('reminderContentRequired'));
      return;
    }
    if (!value.notifyInApp && !value.notifyPush && !value.notifyEmail) {
      this.toast.error(this.i18n.t('channelRequired'));
      return;
    }
    const scheduledDate = new Date(value.scheduledAt);
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      this.toast.error(this.i18n.t('futureDateRequired'));
      return;
    }
    this.saving.set(true);
    this.repo.saveReminder({
      ...value,
      note: value.note || null,
      scheduledAt: scheduledDate.toISOString(),
    }, this.editingId() ?? undefined).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('save'));
        void this.router.navigate(['/notes/reminders']);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.i18n.t('saveFailed'));
      },
    });
  }
}
