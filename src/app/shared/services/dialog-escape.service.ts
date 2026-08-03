import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DialogEscapeService {
  private readonly stack: Array<() => void> = [];
  private listening = false;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    if (event.defaultPrevented) return;
    const top = this.stack[this.stack.length - 1];
    if (!top) return;
    event.preventDefault();
    event.stopPropagation();
    top();
  };

  push(close: () => void): () => void {
    this.stack.push(close);
    this.ensureListening();
    return () => this.remove(close);
  }

  private remove(close: () => void): void {
    const index = this.stack.lastIndexOf(close);
    if (index >= 0) this.stack.splice(index, 1);
    if (this.stack.length === 0) this.stopListening();
  }

  private ensureListening(): void {
    if (this.listening || typeof document === 'undefined') return;
    document.addEventListener('keydown', this.onKeyDown, true);
    this.listening = true;
  }

  private stopListening(): void {
    if (!this.listening || typeof document === 'undefined') return;
    document.removeEventListener('keydown', this.onKeyDown, true);
    this.listening = false;
  }
}
