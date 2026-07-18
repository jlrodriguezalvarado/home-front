import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { ChatSessionService } from './features/chat/services/chat-session.service';
import { ChatNotificationService } from './features/chat/services/chat-notification.service';
import { NotificationsSessionService } from './core/notifications/notifications-session.service';
import { ToastContainerComponent } from './shared/components/toast-container.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ConfirmDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'home-manager';
  private readonly pwaUpdate = inject(PwaUpdateService);
  private readonly chatSession = inject(ChatSessionService);
  private readonly notificationsSession = inject(NotificationsSessionService);
  private readonly notifications = inject(ChatNotificationService);

  ngOnInit(): void {
    this.pwaUpdate.init();
    this.chatSession.start();
    this.notificationsSession.start();
    this.listenToServiceWorkerMessages();
  }

  private listenToServiceWorkerMessages(): void {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data as { type?: string; data?: Record<string, unknown> };
      if (data?.type === 'NOTIFICATION_CLICK') {
        this.notifications.handleNotificationClick(data.data);
      }
    });
  }
}
