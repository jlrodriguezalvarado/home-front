import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { I18nService, AppStringKey } from '../../core/i18n/i18n.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { DialogFormDirective } from '../../shared/directives/dialog-form.directive';
import { ChatSessionService } from '../chat/services/chat-session.service';
import { NotificationsSessionService } from '../../core/notifications/notifications-session.service';

const API_FIELD_TO_CONTROL: Record<string, string> = {
  current_password: 'currentPassword',
  new_password: 'newPassword',
  confirm_password: 'confirmPassword',
};

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogFormDirective],
  templateUrl: './profile-settings.component.html',
  styleUrl: './profile-settings.component.scss',
})
export class ProfileSettingsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  i18n = inject(I18nService);
  auth = inject(AuthService);
  toast = inject(ToastService);
  chatSession = inject(ChatSessionService);
  notificationsSession = inject(NotificationsSessionService);
  userEmail = signal('');
  passwordSaving = signal(false);
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);
  passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', Validators.required],
    confirmPassword: ['', Validators.required],
  });

  ngOnInit(): void {
    this.auth.getCurrentUser().subscribe({
      next: (user) => this.userEmail.set(user.email),
      error: () => this.userEmail.set(''),
    });
  }

  t(key: AppStringKey): string {
    return this.i18n.t(key);
  }

  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword.update((value) => !value);
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword.update((value) => !value);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  fieldError(controlName: 'currentPassword' | 'newPassword' | 'confirmPassword'): string | null {
    const control = this.passwordForm.get(controlName);
    if (!control || (!control.touched && !control.dirty)) return null;
    if (control.errors?.['api']) return control.errors['api'] as string;
    if (controlName === 'confirmPassword' && control.errors?.['passwordMismatch']) {
      return this.t('passwordsDoNotMatch');
    }
    if (control.errors?.['required']) {
      return this.i18n.lang() === 'en' ? 'This field is required' : 'Este campo es obligatorio';
    }
    return null;
  }

  savePassword(): void {
    if (this.passwordSaving()) return;
    this.clearApiFieldErrors();
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordForm.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      this.passwordForm.get('confirmPassword')?.markAsTouched();
      return;
    }
    this.passwordSaving.set(true);
    this.auth.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }).subscribe({
      next: (response) => {
        this.passwordSaving.set(false);
        this.passwordForm.reset();
        this.toast.success(response.detail || this.t('passwordChanged'));
        void this.chatSession.stop().then(() => {
          this.notificationsSession.stop();
          this.auth.logout();
          void this.router.navigate(['/login']);
        });
      },
      error: (err: HttpErrorResponse) => {
        this.passwordSaving.set(false);
        if (err.status === 400) {
          this.applyApiFieldErrors(err.error);
          return;
        }
        if (err.status === 401) {
          this.auth.logout();
          void this.router.navigate(['/login']);
          return;
        }
        this.toast.error(this.t('passwordChangeFailed'));
      },
    });
  }

  private clearApiFieldErrors(): void {
    for (const controlName of ['currentPassword', 'newPassword', 'confirmPassword'] as const) {
      const control = this.passwordForm.get(controlName);
      if (!control?.errors?.['api']) continue;
      const { api: _, ...rest } = control.errors;
      control.setErrors(Object.keys(rest).length ? rest : null);
    }
  }

  private applyApiFieldErrors(body: unknown): void {
    if (!body || typeof body !== 'object') {
      this.toast.error(this.t('passwordChangeFailed'));
      return;
    }
    let hasFieldError = false;
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      const controlName = API_FIELD_TO_CONTROL[key];
      if (!controlName) continue;
      const control = this.passwordForm.get(controlName);
      if (!control) continue;
      const message = Array.isArray(value) ? value.join(' ') : String(value);
      control.setErrors({ api: message });
      control.markAsTouched();
      hasFieldError = true;
    }
    if (!hasFieldError) {
      this.toast.error(this.t('passwordChangeFailed'));
    }
  }
}
