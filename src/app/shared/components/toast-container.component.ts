import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div
      class="pointer-events-none fixed right-6 top-6 z-[100] flex max-w-sm flex-col items-end gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="flex w-full min-w-[12rem] items-center gap-3 rounded-full px-5 py-3 shadow-card transition-all duration-300"
          [class.bg-inverse-surface]="toast.variant === 'info'"
          [class.text-inverse-on-surface]="toast.variant === 'info'"
          [class.bg-primary-container]="toast.variant === 'success'"
          [class.text-on-primary-container]="toast.variant === 'success'"
          [class.bg-error-container]="toast.variant === 'error'"
          [class.text-on-error-container]="toast.variant === 'error'"
          role="status"
        >
          <span class="material-symbols-outlined shrink-0 text-xl">
            {{ iconFor(toast.variant) }}
          </span>
          <span class="text-label-lg font-medium">{{ toast.message }}</span>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  iconFor(variant: string): string {
    switch (variant) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  }
}
