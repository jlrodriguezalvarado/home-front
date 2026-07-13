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
import { Html5Qrcode, Html5QrcodeCameraScanConfig, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { I18nService } from '../../core/i18n/i18n.service';
import { MediaPermissionService } from '../services/media-permission.service';
import { ToastService } from '../services/toast.service';

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

@Component({
  selector: 'app-barcode-scanner-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './barcode-scanner-dialog.component.html',
  styleUrl: './barcode-scanner-dialog.component.scss',
  host: {
    '[class.ios-scanner]': 'isIOS',
  },
})
export class BarcodeScannerDialogComponent implements OnInit, OnDestroy {
  @Output() scanned = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();
  @ViewChild('scannerHost', { static: true }) scannerHost!: ElementRef<HTMLElement>;
  i18n = inject(I18nService);
  private mediaPermissions = inject(MediaPermissionService);
  private toast = inject(ToastService);
  starting = signal(true);
  readonly isIOS = isIOSDevice();
  private scanner?: Html5Qrcode;
  private scanLocked = false;
  private destroyed = false;
  private readonly scannerId = `barcode-scanner-${Math.random().toString(36).slice(2, 9)}`;

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    void this.startScanner();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    document.body.style.overflow = '';
    void this.stopScanner();
  }

  close(): void {
    void this.finish(false);
  }

  private async startScanner(): Promise<void> {
    // Wait one frame so the host has layout before html5-qrcode mounts the video.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (this.destroyed) return;
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
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
      verbose: false,
    });
    const scanConfig = this.buildScanConfig();
    try {
      // Do not call getUserMedia before html5-qrcode on iOS: releasing the
      // stream and restarting immediately often fails with NotReadableError.
      await this.startWithFacingMode(scanConfig);
      if (this.destroyed) {
        await this.stopScanner();
        return;
      }
      this.mediaPermissions.markGranted('camera');
      this.starting.set(false);
    } catch (error) {
      this.starting.set(false);
      this.showStartError(error);
      this.close();
    }
  }

  private buildScanConfig(): Html5QrcodeCameraScanConfig {
    if (this.isIOS) {
      return {
        fps: 12,
        disableFlip: false,
      };
    }
    return {
      fps: 10,
      aspectRatio: 1.7777778,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const width = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.85);
        return { width, height: Math.floor(width * 0.45) };
      },
    };
  }

  private async startWithFacingMode(scanConfig: Html5QrcodeCameraScanConfig): Promise<void> {
    if (!this.scanner) return;
    try {
      await this.scanner.start(
        { facingMode: 'environment' },
        scanConfig,
        (decodedText) => this.onScanSuccess(decodedText),
        () => undefined,
      );
      return;
    } catch {
      // Fallback: pick an explicit camera id (more reliable on some iOS builds).
    }
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras.length) {
      throw new Error('No camera found');
    }
    const preferred =
      cameras.find((camera) => /back|rear|environment|trasera/i.test(camera.label))
      ?? cameras[cameras.length - 1];
    await this.scanner.start(
      preferred.id,
      scanConfig,
      (decodedText) => this.onScanSuccess(decodedText),
      () => undefined,
    );
  }

  private showStartError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const denied = /NotAllowedError|Permission|denied|secure/i.test(message)
      || this.mediaPermissions.getState('camera') === 'denied';
    if (denied) {
      this.toast.error(this.i18n.t('cameraPermissionDeniedHint'));
      return;
    }
    this.toast.error(this.i18n.t('barcodeScannerCameraError'));
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
