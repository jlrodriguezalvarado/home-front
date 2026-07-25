import { Component, ElementRef, inject, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AppError } from '../../core/api/app-error';
import { CartService } from '../shopping/cart.service';
import { ChatSessionService } from '../../features/chat/services/chat-session.service';
import { NotificationsSessionService } from '../../core/notifications/notifications-session.service';
import { I18nService, AppStringKey } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly emailInput = viewChild.required<ElementRef<HTMLInputElement>>('emailInput');
  private readonly passwordInput = viewChild.required<ElementRef<HTMLInputElement>>('passwordInput');
  email = '';
  password = '';
  remember = false;
  showPassword = false;
  loading = false;
  error = '';
  auth = inject(AuthService);
  cart = inject(CartService);
  chatSession = inject(ChatSessionService);
  notificationsSession = inject(NotificationsSessionService);
  i18n = inject(I18nService);
  theme = inject(ThemeService);
  router = inject(Router);

  t(key: AppStringKey) {
    return this.i18n.t(key);
  }

  toggleLang() {
    this.i18n.setLang(this.i18n.lang() === 'en' ? 'es' : 'en');
  }

  onSubmit() {
    // Chrome iOS / PWA autofill writes DOM values without updating ngModel.
    const email = (this.emailInput().nativeElement.value || this.email).trim();
    const password = this.passwordInput().nativeElement.value || this.password;
    this.email = email;
    this.password = password;
    if (!email || !password) {
      this.error =
        this.i18n.lang() === 'en' ? 'Email and password are required.' : 'Email y contraseña son obligatorios.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.login({ email, password }).subscribe({
      next: () => {
        this.chatSession.start();
        this.notificationsSession.start();
        // Clear previous-user memory; guest cart (if any) remains in storage for sync.
        this.cart.resetLocalState();
        this.cart.syncFromServer().subscribe({
          complete: () => void this.router.navigate(['/']),
          error: () => void this.router.navigate(['/']),
        });
      },
      error: (err: unknown) => {
        this.error = this.loginErrorMessage(err);
        this.loading = false;
      },
    });
  }

  private loginErrorMessage(err: unknown): string {
    const en = this.i18n.lang() === 'en';
    if (err instanceof AppError) {
      if (err.status === 0) {
        return en ? 'Unable to connect to the server.' : 'No se pudo conectar con el servidor.';
      }
      if (err.status === 401 || err.status === 400) {
        return en ? 'Invalid credentials' : 'Credenciales inválidas';
      }
      return err.message || (en ? 'Login failed.' : 'Error al iniciar sesión.');
    }
    return en ? 'Invalid credentials' : 'Credenciales inválidas';
  }
}
