import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-barcode-scanner-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './barcode-scanner-dialog.component.html',
  styleUrl: './barcode-scanner-dialog.component.scss',
})
export class BarcodeScannerDialogComponent implements OnInit, OnDestroy {
  @Output() scanned = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  @ViewChild('scannerHost', { static: true }) scannerHost!: ElementRef<HTMLElement>;
  i18n = inject(I18nService);
  private toast = inject(ToastService);
  starting = signal(true);
  private scanner?: Html5Qrcode;
  private scanLocked = false;
  private readonly scannerId = `barcode-scanner-${Math.random().toString(36).slice(2, 9)}`;

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    void this.startScanner();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    void this.stopScanner();
  }

  close(): void {
    void this.finish(false);
  }

  private async startScanner(): Promise<void> {
    const host = this.scannerHost.nativeElement;
    host.id = this.scannerId;
    this.scanner = new Html5Qrcode(this.scannerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
      ],
      verbose: false,
    });
    try {
      await this.scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          aspectRatio: 1.7777778,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.85);
            return { width, height: Math.floor(width * 0.45) };
          },
        },
        (decodedText) => this.onScanSuccess(decodedText),
        () => undefined,
      );
      this.starting.set(false);
    } catch {
      this.starting.set(false);
      this.toast.error(this.i18n.t('barcodeScannerCameraError'));
      this.close();
    }
  }

  private onScanSuccess(code: string): void {
    const normalized = code.trim();
    if (!normalized || this.scanLocked) return;
    this.scanLocked = true;
    void this.finish(true, normalized);
  }

  private async finish(fromScan: boolean, code?: string): Promise<void> {
    await this.stopScanner();
    if (fromScan && code) {
      this.scanned.emit(code);
      return;
    }
    this.closed.emit();
  }

  private async stopScanner(): Promise<void> {
    if (!this.scanner) {
      this.clearHost();
      return;
    }
    const scanner = this.scanner;
    this.scanner = undefined;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      await scanner.clear();
    } catch {
      // Camera may already be released when the dialog closes.
    }
    this.clearHost();
  }

  private clearHost(): void {
    const host = this.scannerHost?.nativeElement;
    if (!host) return;
    host.removeAttribute('id');
    host.innerHTML = '';
  }
}
