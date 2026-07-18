import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { I18nService, AppStringKey } from '../i18n/i18n.service';
import { ThemeService } from '../theme/theme.service';
import { AuthService } from '../auth/auth.service';
import { ChatSessionService } from '../../features/chat/services/chat-session.service';
import { NotificationsSessionService } from '../notifications/notifications-session.service';
import { ChatNotificationService } from '../../features/chat/services/chat-notification.service';
import { PullToRefreshDirective } from '../../shared/directives/pull-to-refresh.directive';
import { NotificationPanelComponent } from '../../shared/components/notification-panel.component';
import { UserProfileMenuComponent } from '../../shared/components/user-profile-menu.component';

interface NavItem {
  path: string;
  label: AppStringKey;
  icon: string;
}

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, PullToRefreshDirective, NotificationPanelComponent, UserProfileMenuComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  i18n = inject(I18nService);
  theme = inject(ThemeService);
  auth = inject(AuthService);
  router = inject(Router);
  chatSession = inject(ChatSessionService);
  notificationsSession = inject(NotificationsSessionService);
  chatNotifications = inject(ChatNotificationService);
  unreadCount = this.chatNotifications.globalUnreadCount;

  drawerOpen = signal(false);

  navItems: NavItem[] = [
    { path: '/', label: 'home', icon: 'home' },
    { path: '/products', label: 'products', icon: 'inventory_2' },
    { path: '/cart', label: 'cart', icon: 'shopping_cart' },
    { path: '/purchases', label: 'orders', icon: 'receipt_long' },
    { path: '/commerces', label: 'stores', icon: 'storefront' },
    { path: '/currencies', label: 'currencies', icon: 'payments' },
    { path: '/price-comparisons', label: 'priceComparisons', icon: 'compare_arrows' },
    { path: '/meal-planning', label: 'mealPlanning', icon: 'restaurant_menu' },
    { path: '/finance', label: 'finances', icon: 'account_balance_wallet' },
    { path: '/mosaic', label: 'instagramTool', icon: 'grid_view' },
    { path: '/notes', label: 'notesAndReminders', icon: 'note_stack' },
    { path: '/chat', label: 'chat', icon: 'chat' },
  ];

  mobileNavItems: NavItem[] = [
    { path: '/', label: 'home', icon: 'home' },
    { path: '/products', label: 'products', icon: 'inventory_2' },
    { path: '/cart', label: 'cart', icon: 'shopping_cart' },
    { path: '/purchases', label: 'orders', icon: 'receipt_long' },
    { path: '/chat', label: 'chat', icon: 'chat' },
  ];

  t(key: AppStringKey) {
    return this.i18n.t(key);
  }

  toggleLang() {
    this.i18n.setLang(this.i18n.lang() === 'en' ? 'es' : 'en');
  }

  toggleDrawer() {
    this.drawerOpen.update(v => !v);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
  }

  isActive(path: string): boolean {
    const url = this.router.url.split('?')[0];
    if (path === '/') return url === '/';
    return url.startsWith(path);
  }

  isInChat(): boolean {
    return this.isActive('/chat');
  }

  isInChatRoom(): boolean {
    return this.router.url.split('?')[0].startsWith('/chat/conversations/');
  }

  logout() {
    this.closeDrawer();
    void this.chatSession.stop().then(() => {
      this.notificationsSession.stop();
      this.auth.logout();
      void this.router.navigate(['/login']);
    });
  }
}
