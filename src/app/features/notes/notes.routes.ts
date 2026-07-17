import { Routes } from '@angular/router';

export const NOTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./notes-list.component').then(m => m.NotesListComponent),
  },
  {
    path: 'create',
    loadComponent: () => import('./note-form.component').then(m => m.NoteFormComponent),
  },
  {
    path: 'reminders',
    loadComponent: () => import('./reminders-list.component').then(m => m.RemindersListComponent),
  },
  {
    path: 'reminders/create',
    loadComponent: () => import('./reminder-form.component').then(m => m.ReminderFormComponent),
  },
  {
    path: 'reminders/:id/edit',
    loadComponent: () => import('./reminder-form.component').then(m => m.ReminderFormComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./note-form.component').then(m => m.NoteFormComponent),
  },
];
