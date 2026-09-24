import { Directive, OnDestroy, OnInit, inject, output } from '@angular/core';
import { DialogEscapeService } from '../services/dialog-escape.service';

@Directive({
  selector: '[appDialogEscape]',
  standalone: true,
})
export class DialogEscapeDirective implements OnInit, OnDestroy {
  private readonly escapeService = inject(DialogEscapeService);
  readonly appDialogEscape = output<void>();
  private unregister: (() => void) | null = null;

  ngOnInit(): void {
    this.unregister = this.escapeService.push(() => this.appDialogEscape.emit());
  }

  ngOnDestroy(): void {
    this.unregister?.();
    this.unregister = null;
  }
}
