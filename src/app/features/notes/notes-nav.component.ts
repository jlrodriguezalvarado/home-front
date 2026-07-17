import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-notes-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="flex gap-xs mb-lg">
      <a routerLink="/notes" routerLinkActive="nav-item-active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item-inactive mx-0 px-sm py-sm rounded-xl text-label-lg">{{ i18n.t('notes') }}</a>
      <a routerLink="/notes/reminders" routerLinkActive="nav-item-active" class="nav-item-inactive mx-0 px-sm py-sm rounded-xl text-label-lg">{{ i18n.t('reminders') }}</a>
    </nav>
  `,
})
export class NotesNavComponent {
  i18n = inject(I18nService);
}
