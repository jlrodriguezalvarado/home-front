import {
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { I18nService, AppStringKey } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';
import { AuthService } from '../../core/auth/auth.service';
import { PushNotificationService } from '../../features/chat/services/push-notification.service';
import { ChatSessionService } from '../../features/chat/services/chat-session.service';
import { NotificationsSessionService } from '../../core/notifications/notifications-session.service';
import { MediaPermissionKind, MediaPermissionService } from '../services/media-permission.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-user-profile-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-profile-menu.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './user-profile-menu.component.scss',
})
export class UserProfileMenuComponent implements OnInit {
  i18n = inject(I18nService);
  theme = inject(ThemeService);
  auth = inject(AuthService);
  push = inject(PushNotificationService);
  chatSession = inject(ChatSessionService);
  notificationsSession = inject(NotificationsSessionService);
  mediaPermissions = inject(MediaPermissionService);
  toast = inject(ToastService);
  router = inject(Router);
  menuOpen = signal(false);
  pushSubscribed = signal(false);
  pushLoading = signal(false);
  mediaPermissionLoading = signal<MediaPermissionKind | null>(null);
  pushSupported = computed(() => this.push.isSupported());
  mediaSupported = computed(() => this.mediaPermissions.isSupported());
  cameraGranted = computed(() => this.mediaPermissions.cameraState() === 'granted');
  microphoneGranted = computed(() => this.mediaPermissions.microphoneState() === 'granted');

  ngOnInit(): void {
    void this.refreshPushSubscriptionState();
    void this.mediaPermissions.refreshStates();
  }

  t(key: AppStringKey): string {
    return this.i18n.t(key);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-user-profile-menu-root]')) {
      this.menuOpen.set(false);
    }
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleLang(event: MouseEvent): void {
    event.stopPropagation();
    this.i18n.setLang(this.i18n.lang() === 'en' ? 'es' : 'en');
  }

  toggleTheme(event: MouseEvent): void {
    event.stopPropagation();
    this.theme.toggleTheme();
  }

  async togglePushNotifications(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    if (!this.pushSupported() || this.pushLoading()) return;
    this.pushLoading.set(true);
    try {
      if (this.pushSubscribed()) {
        const removed = await this.push.unsubscribe();
        if (removed) {
          this.toast.success(this.t('pushSubscriptionRemoved'));
        }
      } else {
        const enabled = await this.push.subscribe();
        if (enabled) {
          this.toast.success(this.t('pushSubscriptionSaved'));
        } else if (Notification.permission === 'denied') {
          this.toast.error(this.t('notificationPermissionDenied'));
        } else {
          this.toast.error(this.t('pushSubscriptionFailed'));
        }
      }
      await this.refreshPushSubscriptionState();
    } finally {
      this.pushLoading.set(false);
    }
  }

  async toggleMediaPermission(event: MouseEvent, kind: MediaPermissionKind): Promise<void> {
    event.stopPropagation();
    if (!this.mediaSupported() || this.mediaPermissionLoading()) return;
    const granted = kind === 'camera' ? this.cameraGranted() : this.microphoneGranted();
    if (granted) {
      this.toast.info(this.t('mediaPermissionManageInSettings'));
      return;
    }
    const denied = this.mediaPermissions.getState(kind) === 'denied';
    if (denied) {
      this.toast.error(
        this.t(kind === 'camera' ? 'cameraPermissionDeniedHint' : 'microphonePermissionDeniedHint'),
      );
      return;
    }
    this.mediaPermissionLoading.set(kind);
    try {
      const state = await this.mediaPermissions.requestPermission(kind);
      if (state === 'granted') {
        this.toast.success(
          this.t(kind === 'camera' ? 'cameraPermissionGranted' : 'microphonePermissionGranted'),
        );
        return;
      }
      this.toast.error(
        this.t(kind === 'camera' ? 'cameraPermissionDenied' : 'microphonePermissionDenied'),
      );
    } finally {
      this.mediaPermissionLoading.set(null);
    }
  }

  logout(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.set(false);
    void this.chatSession.stop().then(() => {
      this.notificationsSession.stop();
      this.auth.logout();
      void this.router.navigate(['/login']);
    });
  }

  private async refreshPushSubscriptionState(): Promise<void> {
    this.pushSubscribed.set(await this.push.hasActiveSubscription());
  }
}
