import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [],
  templateUrl: './error-state.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './error-state.component.scss',
})
export class ErrorStateComponent {
  @Input() title = 'Something went wrong';
  @Input() message = 'We could not load the data. Please try again.';
  @Output() retry = new EventEmitter<void>();
}
