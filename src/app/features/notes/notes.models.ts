export interface Note {
  id: string;
  title: string;
  description: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotePayload {
  title: string;
  description: string;
  isPinned: boolean;
  isArchived: boolean;
}

export type ReminderStatus = 'pending' | 'sent' | 'cancelled';
export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id: string;
  note: string | null;
  noteTitle: string;
  title: string;
  description: string;
  scheduledAt: string;
  recurrence: ReminderRecurrence;
  notifyInApp: boolean;
  notifyPush: boolean;
  notifyEmail: boolean;
  status: ReminderStatus;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderPayload {
  note: string | null;
  title: string;
  description: string;
  scheduledAt: string;
  recurrence: ReminderRecurrence;
  notifyInApp: boolean;
  notifyPush: boolean;
  notifyEmail: boolean;
}
