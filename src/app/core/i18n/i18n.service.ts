import { Injectable, signal } from '@angular/core';
import type { AppStringKey } from './app-string-key';
import en from './en.json';
import es from './es.json';

export type Lang = 'en' | 'es';
export type { AppStringKey } from './app-string-key';

/** Fail compile if en.json keys drift from generated AppStringKey. */
type AssertSameKeys<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _enKeysMatchGenerated: AssertSameKeys<keyof typeof en, AppStringKey> = true;
void _enKeysMatchGenerated;

const catalogs: Record<Lang, Record<AppStringKey, string>> = {
  en,
  es: es as Record<AppStringKey, string>,
};

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly LANG_KEY = 'app_lang';
  private _lang = signal<Lang>((localStorage.getItem(this.LANG_KEY) as Lang) || 'en');
  lang = this._lang.asReadonly();

  translate(key: AppStringKey): string {
    return catalogs[this._lang()][key] || key;
  }

  setLang(lang: Lang) {
    this._lang.set(lang);
    localStorage.setItem(this.LANG_KEY, lang);
  }

  t(key: AppStringKey): string {
    return this.translate(key);
  }
}
