import {
  Component,
  ElementRef,
  forwardRef,
  ViewChild,
  AfterViewInit,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

type ToolbarAction = 'bold' | 'italic' | 'underline' | 'bulletList' | 'orderedList' | 'link';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
})
export class RichTextEditorComponent implements ControlValueAccessor, AfterViewInit {
  @ViewChild('editor') editorRef?: ElementRef<HTMLDivElement>;
  @Input() placeholder = '';
  @Input() minHeight = '120px';
  disabled = false;
  private pendingValue = '';
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit() {
    if (!this.editorRef) return;
    if (this.pendingValue) {
      this.editorRef.nativeElement.innerHTML = this.pendingValue;
      this.pendingValue = '';
    }
  }

  writeValue(value: string | null): void {
    const html = value ?? '';
    if (this.editorRef) {
      this.editorRef.nativeElement.innerHTML = html;
      return;
    }
    this.pendingValue = html;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  runAction(action: ToolbarAction, event: Event) {
    event.preventDefault();
    if (this.disabled) return;
    this.focusEditor();
    if (action === 'link') {
      this.insertLink();
      return;
    }
    const commandMap: Record<Exclude<ToolbarAction, 'link'>, string> = {
      bold: 'bold',
      italic: 'italic',
      underline: 'underline',
      bulletList: 'insertUnorderedList',
      orderedList: 'insertOrderedList',
    };
    document.execCommand(commandMap[action], false);
    this.emitValue();
  }

  onInput() {
    this.emitValue();
  }

  onBlur() {
    this.onTouched();
    this.emitValue();
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
    this.emitValue();
  }

  private insertLink() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const url = window.prompt('URL');
    if (!url?.trim()) return;
    try {
      const parsed = new URL(url.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) return;
      document.execCommand('createLink', false, parsed.toString());
      this.emitValue();
    } catch {
      return;
    }
  }

  private focusEditor() {
    this.editorRef?.nativeElement.focus();
  }

  private emitValue() {
    const html = this.normalizeHtml(this.editorRef?.nativeElement.innerHTML ?? '');
    this.onChange(html);
  }

  private normalizeHtml(html: string): string {
    const trimmed = html.trim();
    if (!trimmed || trimmed === '<br>' || trimmed === '<div><br></div>') return '';
    return trimmed;
  }
}
