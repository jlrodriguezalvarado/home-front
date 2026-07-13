import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CartService } from '../shopping/cart.service';
import { ChatSessionService } from '../../features/chat/services/chat-session.service';
import { NotificationsSessionService } from '../../core/notifications/notifications-session.service';
import { I18nService, AppStringKey } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
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
    this.loading = true;
    this.error = '';
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.chatSession.start();
        this.notificationsSession.start();
        this.cart.syncFromServer().subscribe({
          complete: () => void this.router.navigate(['/']),
          error: () => void this.router.navigate(['/']),
        });
      },
      error: () => {
        this.error = this.i18n.lang() === 'en' ? 'Invalid credentials' : 'Credenciales inválidas';
        this.loading = false;
      }
    });
  }
}
