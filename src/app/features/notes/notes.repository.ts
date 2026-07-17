import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { API_ENDPOINTS } from '../../core/api/endpoints';
import { PaginatedResponse } from '../../core/api/models';
import { Note, NotePayload, Reminder, ReminderPayload } from './notes.models';

function itemsFromResponse(response: unknown[] | PaginatedResponse<unknown>): unknown[] {
  return Array.isArray(response) ? response : (response.results ?? []);
}

function mapNote(value: unknown): Note {
  const item = value as Record<string, unknown>;
  return {
    id: String(item['id']),
    title: String(item['title'] ?? ''),
    description: String(item['description'] ?? ''),
    isPinned: Boolean(item['is_pinned']),
    isArchived: Boolean(item['is_archived']),
    createdAt: String(item['created_at']),
    updatedAt: String(item['updated_at']),
  };
}

function mapReminder(value: unknown): Reminder {
  const item = value as Record<string, unknown>;
  return {
    id: String(item['id']),
    note: item['note'] ? String(item['note']) : null,
    noteTitle: String(item['note_title'] ?? ''),
    title: String(item['title'] ?? ''),
    description: String(item['description'] ?? ''),
    scheduledAt: String(item['scheduled_at']),
    recurrence: item['recurrence'] as Reminder['recurrence'],
    notifyInApp: Boolean(item['notify_in_app']),
    notifyPush: Boolean(item['notify_push']),
    notifyEmail: Boolean(item['notify_email']),
    status: item['status'] as Reminder['status'],
    sentAt: item['sent_at'] ? String(item['sent_at']) : null,
    createdAt: String(item['created_at']),
    updatedAt: String(item['updated_at']),
  };
}

function noteBody(payload: NotePayload) {
  return {
    title: payload.title,
    description: payload.description,
    is_pinned: payload.isPinned,
    is_archived: payload.isArchived,
  };
}

function reminderBody(payload: ReminderPayload) {
  return {
    note: payload.note,
    title: payload.title,
    description: payload.description,
    scheduled_at: payload.scheduledAt,
    recurrence: payload.recurrence,
    notify_in_app: payload.notifyInApp,
    notify_push: payload.notifyPush,
    notify_email: payload.notifyEmail,
  };
}

@Injectable({ providedIn: 'root' })
export class NotesRepository {
  private readonly api = inject(ApiService);

  listNotes(params?: Record<string, string | number | boolean>): Observable<Note[]> {
    return this.api.get<unknown[] | PaginatedResponse<unknown>>(API_ENDPOINTS.notes.list, { params })
      .pipe(map(response => itemsFromResponse(response).map(mapNote)));
  }

  getNote(id: string): Observable<Note> {
    return this.api.get<unknown>(API_ENDPOINTS.notes.detail(id)).pipe(map(mapNote));
  }

  saveNote(payload: NotePayload, id?: string): Observable<Note> {
    const request = id
      ? this.api.patch<unknown>(API_ENDPOINTS.notes.detail(id), noteBody(payload))
      : this.api.post<unknown>(API_ENDPOINTS.notes.list, noteBody(payload));
    return request.pipe(map(mapNote));
  }

  deleteNote(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.notes.detail(id));
  }

  pinNote(id: string): Observable<Note> {
    return this.api.post<unknown>(API_ENDPOINTS.notes.pin(id), {}).pipe(map(mapNote));
  }

  listReminders(params?: Record<string, string | number | boolean>): Observable<Reminder[]> {
    return this.api.get<unknown[] | PaginatedResponse<unknown>>(API_ENDPOINTS.reminders.list, { params })
      .pipe(map(response => itemsFromResponse(response).map(mapReminder)));
  }

  getReminder(id: string): Observable<Reminder> {
    return this.api.get<unknown>(API_ENDPOINTS.reminders.detail(id)).pipe(map(mapReminder));
  }

  saveReminder(payload: ReminderPayload, id?: string): Observable<Reminder> {
    const request = id
      ? this.api.patch<unknown>(API_ENDPOINTS.reminders.detail(id), reminderBody(payload))
      : this.api.post<unknown>(API_ENDPOINTS.reminders.list, reminderBody(payload));
    return request.pipe(map(mapReminder));
  }

  deleteReminder(id: string): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.reminders.detail(id));
  }
}
