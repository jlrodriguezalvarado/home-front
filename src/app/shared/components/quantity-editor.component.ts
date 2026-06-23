import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../core/models/shopping.models';
import {
  formatKgQuantityDisplay,
  isPresentationUnitKg,
  KG_QUANTITY_INPUT_REGEX,
  parseQuantityInput,
  quantityStep,
} from '../../features/shopping/utils/presentation-unit.utils';

@Component({
  selector: 'app-quantity-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quantity-editor.component.html',
  styleUrl: './quantity-editor.component.scss'
})
export class QuantityEditorComponent {
  @Input({ required: true }) product!: Product;
  @Input({ required: true }) quantity!: number;
  @Input() compact = false;
  @Output() setQuantity = new EventEmitter<number>();
  editValue: string | null = null;

  get isKg(): boolean {
    return isPresentationUnitKg(this.product.presentationUnit);
  }

  get step(): number {
    return quantityStep(this.product.presentationUnit);
  }

  get displayValue(): string {
    return this.isKg ? formatKgQuantityDisplay(this.quantity) : String(Math.round(this.quantity));
  }

  get inputValue(): string {
    return this.editValue ?? this.displayValue;
  }

  decrement(): void {
    this.editValue = null;
    const next = Math.max(0, this.quantity - this.step);
    this.setQuantity.emit(next);
  }

  increment(): void {
    this.editValue = null;
    this.setQuantity.emit(this.quantity + this.step);
  }

  onInputFocus(): void {
    this.editValue = this.displayValue;
  }

  onInputChange(raw: string): void {
    if (!KG_QUANTITY_INPUT_REGEX.test(raw)) return;
    this.editValue = raw;
    const parsed = parseQuantityInput(raw);
    if (parsed != null && parsed > 0) {
      this.setQuantity.emit(parsed);
    }
  }

  onInputBlur(): void {
    const raw = (this.editValue ?? this.displayValue).trim();
    if (!raw) {
      this.setQuantity.emit(0);
    } else {
      const parsed = parseQuantityInput(raw);
      if (parsed != null) {
        this.setQuantity.emit(parsed);
      } else if (raw === '0' || /^0[.,]?$/.test(raw)) {
        this.setQuantity.emit(0);
      }
    }
    this.editValue = null;
  }
}
