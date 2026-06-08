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

  get isKg(): boolean {
    return isPresentationUnitKg(this.product.presentationUnit);
  }

  get step(): number {
    return quantityStep(this.product.presentationUnit);
  }

  get displayValue(): string {
    return this.isKg ? formatKgQuantityDisplay(this.quantity) : String(Math.round(this.quantity));
  }

  decrement(): void {
    const next = Math.max(0, this.quantity - this.step);
    this.setQuantity.emit(next);
  }

  increment(): void {
    this.setQuantity.emit(this.quantity + this.step);
  }

  onInputChange(raw: string): void {
    if (!KG_QUANTITY_INPUT_REGEX.test(raw)) return;
    const parsed = parseQuantityInput(raw);
    if (parsed == null) return;
    this.setQuantity.emit(parsed);
  }
}
