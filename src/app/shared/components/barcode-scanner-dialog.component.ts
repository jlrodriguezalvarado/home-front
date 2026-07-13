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
    const hasAccess = await this.mediaPermissions.ensureAccess('camera');
    if (!hasAccess) {
      this.starting.set(false);
      if (this.mediaPermissions.getState('camera') === 'denied') {
        this.toast.error(this.i18n.t('cameraPermissionDeniedHint'));
      } else {
        this.toast.error(this.i18n.t('barcodeScannerCameraError'));
      }
      this.close();
      return;
    }
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
    const cameraConfigs: MediaTrackConstraints[] = this.isIOS
      ? [
          {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          { facingMode: 'environment' },
        ]
      : [{ facingMode: 'environment' }];
    const scanConfig: Html5QrcodeCameraScanConfig = this.isIOS
      ? {
          fps: 15,
          disableFlip: false,
        }
      : {
          fps: 10,
          aspectRatio: 1.7777778,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.85);
            return { width, height: Math.floor(width * 0.45) };
          },
        };
    try {
      let started = false;
      for (const cameraConfig of cameraConfigs) {
        try {
          await this.scanner.start(
            cameraConfig,
            scanConfig,
            (decodedText) => this.onScanSuccess(decodedText),
            () => undefined,
          );
          started = true;
          break;
        } catch {
          if (this.scanner.isScanning) {
            await this.scanner.stop();
          }
        }
      }
      if (!started) {
        throw new Error('Could not start camera');
      }
      if (this.isIOS) {
        await this.applyIOSCameraTuning();
      }
      this.starting.set(false);
    } catch {
      this.starting.set(false);
      this.toast.error(this.i18n.t('barcodeScannerCameraError'));
      this.close();
    }
  }

  private async applyIOSCameraTuning(): Promise<void> {
    if (!this.scanner?.isScanning) return;
    try {
      const caps = this.scanner.getRunningTrackCapabilities() as MediaTrackCapabilities & {
        focusDistance?: { min: number; max: number };
        zoom?: { min: number; max: number };
      };
      const advanced: MediaTrackConstraintSet[] = [];
      if (caps.focusDistance) {
        const focusDistance = Math.min(
          caps.focusDistance.max,
          Math.max(caps.focusDistance.min, (caps.focusDistance.min + caps.focusDistance.max) * 0.35),
        );
        advanced.push({ focusDistance } as MediaTrackConstraintSet);
      }
      if (caps.zoom) {
        const zoom = Math.min(caps.zoom.max, Math.max(caps.zoom.min, 1));
        advanced.push({ zoom } as MediaTrackConstraintSet);
      }
      await this.scanner.applyVideoConstraints({
        width: { ideal: Math.min(caps.width?.max ?? 1280, 1280) },
        height: { ideal: Math.min(caps.height?.max ?? 720, 720) },
        frameRate: { ideal: Math.min(caps.frameRate?.max ?? 30, 30) },
        ...(advanced.length > 0 ? { advanced } : {}),
      });
    } catch {
      // Best-effort tuning for iOS autofocus and resolution.
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
