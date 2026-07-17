import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService } from '../../shared/services/toast.service';
import { Note } from './notes.models';
import { NotesNavComponent } from './notes-nav.component';
import { NotesRepository } from './notes.repository';

@Component({
  selector: 'app-notes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NotesNavComponent],
  template: `
    <div class="space-y-lg">
      <app-notes-nav></app-notes-nav>
      <div class="flex flex-wrap items-center justify-between gap-md">
        <h1 class="page-title">{{ i18n.t('notes') }}</h1>
        <a routerLink="/notes/create" class="btn-primary flex items-center gap-2"><span class="material-symbols-outlined">add</span>{{ i18n.t('newNote') }}</a>
      </div>
      <input type="search" [ngModel]="search()" (ngModelChange)="search.set($event); load()" [placeholder]="i18n.t('search')" class="input-outlined w-full">
      <div *ngIf="loading()" class="text-center p-lg">{{ i18n.t('processing') }}</div>
      <div *ngIf="!loading() && notes().length === 0" class="card-surface p-xl text-center text-on-surface-variant">{{ i18n.t('noNotes') }}</div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
        <article *ngFor="let note of notes()" class="card-surface p-lg space-y-sm">
          <div class="flex items-start justify-between gap-sm">
            <a [routerLink]="['/notes', note.id, 'edit']" class="text-title-lg text-on-surface flex-1">{{ note.title || i18n.t('untitledNote') }}</a>
            <button type="button" (click)="togglePin(note)" [attr.aria-label]="i18n.t('pinNote')" class="text-primary"><span class="material-symbols-outlined" [class.material-symbols-filled]="note.isPinned">push_pin</span></button>
          </div>
          <div class="rich-text-content text-body-md text-on-surface-variant line-clamp-5" [innerHTML]="note.description"></div>
          <div class="flex justify-end gap-sm pt-sm">
            <a [routerLink]="['/notes', note.id, 'edit']" class="btn-secondary">{{ i18n.t('edit') }}</a>
            <button type="button" (click)="remove(note)" class="text-error px-sm">{{ i18n.t('delete') }}</button>
          </div>
        </article>
      </div>
    </div>
  `,
})
export class NotesListComponent implements OnInit {
  private readonly repo = inject(NotesRepository);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  i18n = inject(I18nService);
  notes = signal<Note[]>([]);
  search = signal('');
  loading = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    const search = this.search().trim();
    this.repo.listNotes({ is_archived: false, ...(search ? { search } : {}) }).subscribe({
      next: notes => {
        this.notes.set(notes);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  togglePin(note: Note) {
    this.repo.pinNote(note.id).subscribe({ next: () => this.load() });
  }

  async remove(note: Note) {
    const confirmed = await this.confirm.confirm(this.i18n.t('deleteNoteConfirm'), { variant: 'danger', confirmLabel: this.i18n.t('delete') });
    if (!confirmed) return;
    this.repo.deleteNote(note.id).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('delete'));
        this.load();
      },
    });
  }
}
