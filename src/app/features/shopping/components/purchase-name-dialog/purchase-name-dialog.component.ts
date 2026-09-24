import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { DialogEscapeDirective } from '../../../../shared/directives/dialog-escape.directive';
import { DialogFormDirective } from '../../../../shared/directives/dialog-form.directive';

@Component({
  selector: 'app-purchase-name-dialog',
  standalone: true,
  imports: [FormsModule, DialogEscapeDirective, DialogFormDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './purchase-name-dialog.component.html',
})
export class PurchaseNameDialogComponent {
  i18n = inject(I18nService);
  title = input('');
  initialName = input('');
  confirmLabel = input('');
  busy = input(false);
  saved = output<string>();
  cancelled = output<void>();
  draft = signal('');

  constructor() {
    effect(() => {
      this.draft.set(this.initialName());
    });
  }

  canSave(): boolean {
    return !!this.draft().trim() && !this.busy();
  }

  save(): void {
    const name = this.draft().trim();
    if (!name || this.busy()) return;
    this.saved.emit(name);
  }

  cancel(): void {
    if (this.busy()) return;
    this.cancelled.emit();
  }
}
