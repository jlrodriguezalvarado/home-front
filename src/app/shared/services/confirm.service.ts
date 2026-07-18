import { Injectable, signal } from '@angular/core';

export type ConfirmVariant = 'default' | 'danger';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

export interface ConfirmState extends ConfirmOptions {
  visible: true;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state = signal<ConfirmState | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  confirm(message: string, options: Omit<ConfirmOptions, 'message'> = {}): Promise<boolean> {
    return this.open({ message, ...options });
  }

  open(options: ConfirmOptions): Promise<boolean> {
    this.closePending(false);

    return new Promise((resolve) => {
      this.resolver = resolve;
      this.state.set({ ...options, visible: true });
    });
  }

  accept(): void {
    this.closePending(true);
  }

  reject(): void {
    this.closePending(false);
  }

  private closePending(result: boolean): void {
    this.resolver?.(result);
    this.resolver = null;
    this.state.set(null);
  }
}
