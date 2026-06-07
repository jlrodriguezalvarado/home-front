import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div class="text-6xl">{{ icon }}</div>
      <h3 class="text-xl font-bold">{{ title }}</h3>
      <p class="text-gray-500 max-w-xs">{{ message }}</p>
    </div>
  `
})
export class EmptyStateComponent {
  @Input() icon = '📂';
  @Input() title = 'No results found';
  @Input() message = 'Try adjusting your search or filters.';
}
