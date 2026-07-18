import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { RichTextEditorComponent } from '../../shared/components/rich-text-editor.component';
import { ToastService } from '../../shared/services/toast.service';
import { NotesNavComponent } from './notes-nav.component';
import { NotesRepository } from './notes.repository';

@Component({
  selector: 'app-note-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, RichTextEditorComponent, NotesNavComponent],
  template: `
    <div class="space-y-lg">
      <app-notes-nav></app-notes-nav>
      <h1 class="page-title">{{ editingId() ? i18n.t('editNote') : i18n.t('newNote') }}</h1>
      <form [formGroup]="form" (ngSubmit)="save()" class="card-surface p-lg space-y-md max-w-3xl">
        <div>
          <label class="text-label-lg text-on-surface-variant block mb-xs">{{ i18n.t('name') }} ({{ i18n.t('optional') }})</label>
          <input type="text" formControlName="title" class="input-outlined">
        </div>
        <div>
          <label class="text-label-lg text-on-surface-variant block mb-xs">{{ i18n.t('description') }}</label>
          <app-rich-text-editor formControlName="description" minHeight="280px" [placeholder]="i18n.t('notePlaceholder')"></app-rich-text-editor>
        </div>
        <label class="flex items-center gap-sm"><input type="checkbox" formControlName="isPinned">{{ i18n.t('pinNote') }}</label>
        <div class="flex gap-md">
          <a routerLink="/notes" class="btn-secondary flex-1 text-center">{{ i18n.t('cancel') }}</a>
          <button type="submit" [disabled]="saving()" class="btn-primary flex-1">{{ i18n.t('save') }}</button>
        </div>
      </form>
    </div>
  `,
})
export class NoteFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repo = inject(NotesRepository);
  private readonly toast = inject(ToastService);
  i18n = inject(I18nService);
  editingId = signal<string | null>(null);
  saving = signal(false);
  form = this.fb.nonNullable.group({
    title: '',
    description: '',
    isPinned: false,
    isArchived: false,
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.editingId.set(id);
    if (!id) return;
    this.repo.getNote(id).subscribe({
      next: note => this.form.patchValue(note),
      error: () => void this.router.navigate(['/notes']),
    });
  }

  save() {
    const payload = this.form.getRawValue();
    if (!payload.title.trim() && !payload.description.trim()) {
      this.toast.error(this.i18n.t('noteContentRequired'));
      return;
    }
    this.saving.set(true);
    this.repo.saveNote(payload, this.editingId() ?? undefined).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('save'));
        void this.router.navigate(['/notes']);
      },
      error: () => {
        this.saving.set(false);
        this.toast.error(this.i18n.t('saveFailed'));
      },
    });
  }
}
