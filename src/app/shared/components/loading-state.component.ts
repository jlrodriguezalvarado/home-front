import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [],
  templateUrl: './loading-state.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './loading-state.component.scss',
})
export class LoadingStateComponent {
  @Input() message = 'Loading...';
}
