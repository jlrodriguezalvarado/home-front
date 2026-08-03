import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { ConfirmService } from '../services/confirm.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { DialogEscapeDirective } from '../directives/dialog-escape.directive';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [DialogEscapeDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (confirmService.state(); as dialog) {
      <div
        class="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-md"
        role="dialog"
        aria-modal="true"
        (click)="confirmService.reject()"
        (appDialogEscape)="confirmService.reject()"
      >
        <div
          class="w-full max-w-md rounded-[24px] border border-outline-variant bg-surface-container-lowest p-xl shadow-card-hover"
          (click)="$event.stopPropagation()"
        >
          @if (dialog.title) {
            <h2 class="mb-sm text-title-lg text-on-surface">{{ dialog.title }}</h2>
          }
          <p
            class="text-body-md text-on-surface-variant"
            [class.mb-lg]="!dialog.title"
            [class.mt-sm]="!!dialog.title"
          >
            {{ dialog.message }}
          </p>
          <div class="flex gap-md pt-md">
            <button
              type="button"
              class="flex-1 rounded-xl border border-outline-variant py-3 text-label-lg text-on-surface"
              (click)="confirmService.reject()"
            >
              {{ dialog.cancelLabel ?? i18n.t('cancel') }}
            </button>
            <button
              type="button"
              class="flex-1 rounded-xl py-3 text-label-lg font-semibold"
              [class.btn-primary]="dialog.variant !== 'danger'"
              [class.bg-error]="dialog.variant === 'danger'"
              [class.text-on-error]="dialog.variant === 'danger'"
              (click)="confirmService.accept()"
            >
              {{ dialog.confirmLabel ?? i18n.t('confirm') }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  confirmService = inject(ConfirmService);
  i18n = inject(I18nService);
}
