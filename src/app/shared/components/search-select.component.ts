import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { LoadingStateComponent } from './loading-state.component';
import { DialogEscapeDirective } from '../directives/dialog-escape.directive';

export interface SearchSelectOption {
  value: string;
  label: string;
}

interface PanelStyle {
  top: string;
  left: string;
  width: string;
  maxHeight: string;
}

@Component({
  selector: 'app-search-select',
  standalone: true,
  imports: [FormsModule, LoadingStateComponent, DialogEscapeDirective],
  templateUrl: './search-select.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './search-select.component.scss',
})
export class SearchSelectComponent implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  @Input() options: SearchSelectOption[] = [];
  @Input() value: string | null = null;
  @Input() placeholder = 'Select...';
  @Input() searchPlaceholder = 'Search...';
  @Input() emptyLabel = 'No results';
  @Input() loading = false;
  @Input() clearable = true;
  @Output() valueChange = new EventEmitter<string | null>();
  @Output() searchChange = new EventEmitter<string>();
  open = signal(false);
  searchQuery = signal('');
  panelStyle = signal<PanelStyle | null>(null);
  filteredOptions = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const items = this.options;
    if (!q) return items;
    return items.filter((opt) => opt.label.toLowerCase().includes(q));
  });
  private readonly onViewportChange = () => {
    if (this.open()) this.updatePanelPosition();
  };

  ngOnDestroy() {
    this.removeViewportListeners();
  }

  selectedLabel(): string {
    if (!this.value) return '';
    return this.options.find((opt) => opt.value === this.value)?.label ?? '';
  }

  toggle() {
    this.open.update((v) => !v);
    if (this.open()) {
      this.searchQuery.set('');
      this.searchChange.emit('');
      queueMicrotask(() => {
        this.updatePanelPosition();
        this.addViewportListeners();
      });
    } else {
      this.close();
    }
  }

  close() {
    this.open.set(false);
    this.panelStyle.set(null);
    this.searchQuery.set('');
    this.removeViewportListeners();
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    this.searchChange.emit(value);
  }

  select(option: SearchSelectOption) {
    this.valueChange.emit(option.value);
    this.close();
  }

  clear(event: Event) {
    event.stopPropagation();
    this.valueChange.emit(null);
    this.close();
  }

  private updatePanelPosition(): void {
    const trigger = this.el.nativeElement.querySelector(
      '[data-search-select-trigger]',
    ) as HTMLElement | null;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const maxPanelHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    let top = rect.bottom + gap;
    let maxHeight = Math.min(maxPanelHeight, spaceBelow);
    if (spaceBelow < 160 && spaceAbove > spaceBelow) {
      const height = Math.min(maxPanelHeight, spaceAbove);
      top = Math.max(gap, rect.top - gap - height);
      maxHeight = height;
    }
    this.panelStyle.set({
      top: `${top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      maxHeight: `${Math.max(maxHeight, 120)}px`,
    });
  }

  private addViewportListeners(): void {
    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
  }

  private removeViewportListeners(): void {
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
  }
}
