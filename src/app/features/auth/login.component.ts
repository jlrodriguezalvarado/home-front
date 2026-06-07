import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService, AppStringKey } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-screen flex items-center justify-center bg-light-scaffold dark:bg-dark-scaffold px-4">
      <div class="max-w-md w-full bg-white dark:bg-dark-surface p-8 rounded-2xl shadow-xl">
        <h1 class="text-3xl font-bold text-primary mb-6 text-center">Home Manager</h1>
        <form (submit)="onSubmit()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">{{ t('email') }}</label>
            <input type="email" [(ngModel)]="email" name="email" required
                   class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-primary outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">{{ t('password') }}</label>
            <input type="password" [(ngModel)]="password" name="password" required
                   class="w-full px-4 py-2 rounded-lg border dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-primary outline-none">
          </div>
          <button type="submit" [disabled]="loading"
                  class="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-secondary transition-colors disabled:opacity-50">
            {{ loading ? '...' : t('login') }}
          </button>
          <div *ngIf="error" class="text-red-500 text-sm text-center">{{ error }}</div>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  error = '';

  auth = inject(AuthService);
  i18n = inject(I18nService);
  router = inject(Router);

  t(key: AppStringKey) {
    return this.i18n.t(key);
  }

  onSubmit() {
    this.loading = true;
    this.error = '';
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.error = 'Invalid credentials';
        this.loading = false;
      }
    });
  }
}
