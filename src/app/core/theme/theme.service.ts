import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app_theme';
  private _isDark = signal<boolean>(localStorage.getItem(this.THEME_KEY) === 'dark');

  isDark = this._isDark.asReadonly();

  constructor() {
    effect(() => {
      if (this._isDark()) {
        document.documentElement.classList.add('dark');
        localStorage.setItem(this.THEME_KEY, 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem(this.THEME_KEY, 'light');
      }
    });
  }

  toggleTheme() {
    this._isDark.update(v => !v);
  }
}
