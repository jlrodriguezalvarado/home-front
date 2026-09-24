import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'No results found';
  @Input() message = 'Try adjusting your search or filters.';
}
