import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'chat_recent_emojis';
const MAX_RECENT_EMOJIS = 32;

@Injectable({ providedIn: 'root' })
export class ChatRecentEmojiService {
  private readonly recents = signal<string[]>(this.loadFromStorage());
  recentEmojis = this.recents.asReadonly();

  add(unicode: string): void {
    const normalized = unicode.trim();
    if (!normalized) return;
    const next = [normalized, ...this.recents().filter((emoji) => emoji !== normalized)].slice(0, MAX_RECENT_EMOJIS);
    this.recents.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  private loadFromStorage(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    } catch {
      return [];
    }
  }
}
