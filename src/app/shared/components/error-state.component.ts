import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-12 text-center space-y-4">
      <div class="text-6xl text-red-500">⚠️</div>
      <h3 class="text-xl font-bold text-red-600">{{ title }}</h3>
      <p class="text-gray-500 max-w-xs">{{ message }}</p>
      <button (click)="retry.emit()" class="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-secondary">
        Retry
      </button>
    </div>
  `
})
export class ErrorStateComponent {
  @Input() title = 'Something went wrong';
  @Input() message = 'We could not load the data. Please try again.';
  @Output() retry = new EventEmitter<void>();
}
