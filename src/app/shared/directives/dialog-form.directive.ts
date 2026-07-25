import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';

const FOCUSABLE_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])';

@Directive({
  selector: '[appDialogForm]',
  standalone: true,
})
export class DialogFormDirective implements AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private observer: MutationObserver | null = null;
  private focused = false;

  @Input() dialogSubmitDisabled = false;
  @Output() dialogSubmit = new EventEmitter<void>();

  ngAfterViewInit(): void {
    queueMicrotask(() => this.tryFocusFirstField());
    this.observer = new MutationObserver(() => this.tryFocusFirstField());
    this.observer.observe(this.el.nativeElement, { childList: true, subtree: true });
    setTimeout(() => this.disconnectObserver(), 2000);
  }

  ngOnDestroy(): void {
    this.disconnectObserver();
  }

  @HostListener('keydown.enter', ['$event'])
  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const target = keyboardEvent.target as HTMLElement;
    const tag = target.tagName;
    if (tag === 'TEXTAREA' || tag === 'BUTTON') return;
    if (this.dialogSubmitDisabled) return;
    keyboardEvent.preventDefault();
    this.dialogSubmit.emit();
  }

  private tryFocusFirstField(): void {
    if (this.focused) return;
    const field = this.el.nativeElement.querySelector(FOCUSABLE_SELECTOR) as HTMLElement | null;
    if (!field) return;
    field.focus();
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      field.select();
    }
    this.focused = true;
    this.disconnectObserver();
  }

  private disconnectObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
