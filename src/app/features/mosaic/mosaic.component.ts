import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../core/i18n/i18n.service';
import JSZip from 'jszip';

@Component({
  selector: 'app-mosaic',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 pb-20">
      <h1 class="text-3xl font-bold">{{ i18n.t('mosaicGrid') }}</h1>

      <div class="flex flex-col md:flex-row gap-8">
        <!-- Controls -->
        <div class="w-full md:w-64 space-y-6">
          <div class="p-6 bg-white dark:bg-dark-surface rounded-2xl border dark:border-gray-800 shadow-sm">
            <label class="block w-full py-3 bg-primary text-white text-center rounded-lg cursor-pointer font-bold">
              Upload Image
              <input type="file" (change)="onFileSelected($event)" accept="image/*" class="hidden">
            </label>

            <div class="mt-6 space-y-4">
              <p class="text-sm font-medium">Presets</p>
              <div class="grid grid-cols-2 gap-2">
                <button *ngFor="let p of presets" (click)="setPreset(p.rows, p.cols)"
                        [class.bg-primary]="rows() === p.rows && cols() === p.cols"
                        [class.text-white]="rows() === p.rows && cols() === p.cols"
                        class="p-2 border dark:border-gray-700 rounded-lg text-sm transition-colors">
                  {{ p.rows }}x{{ p.cols }}
                </button>
              </div>
            </div>

            <button *ngIf="imageSrc()" (click)="generateTiles()" [disabled]="generating()"
                    class="w-full mt-6 py-3 border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-colors">
              {{ generating() ? '...' : 'Download ZIP' }}
            </button>
          </div>
        </div>

        <!-- Preview -->
        <div class="flex-1 min-h-[400px] bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden relative flex items-center justify-center p-8">
          <div *ngIf="!imageSrc()" class="text-gray-400">No image selected</div>

          <div *ngIf="imageSrc()" class="relative border-4 border-dashed border-primary/30"
               [style.width.px]="previewWidth" [style.height.px]="previewHeight">
            <img [src]="imageSrc()" class="w-full h-full object-cover opacity-50">

            <!-- Grid overlay -->
            <div class="absolute inset-0 grid" [style.gridTemplateRows]="'repeat(' + rows() + ', 1fr)'"
                 [style.gridTemplateColumns]="'repeat(' + cols() + ', 1fr)'">
              <div *ngFor="let i of gridArray()" class="border border-white/50 bg-primary/10"></div>
            </div>
          </div>
        </div>
      </div>

      <canvas #canvas class="hidden"></canvas>
    </div>
  `
})
export class MosaicComponent {
  i18n = inject(I18nService);

  imageSrc = signal<string | null>(null);
  rows = signal(3);
  cols = signal(3);
  generating = signal(false);

  previewWidth = 300;
  previewHeight = 300;

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  presets = [
    { rows: 3, cols: 3 },
    { rows: 3, cols: 2 },
    { rows: 3, cols: 1 },
    { rows: 2, cols: 2 },
  ];

  gridArray() {
    return Array(this.rows() * this.cols()).fill(0);
  }

  setPreset(r: number, c: number) {
    this.rows.set(r);
    this.cols.set(c);
    this.updatePreviewSize();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imageSrc.set(e.target.result);
      this.updatePreviewSize();
    };
    reader.readAsDataURL(file);
  }

  updatePreviewSize() {
    const ratio = this.cols() / this.rows();
    if (ratio > 1) {
      this.previewWidth = 400;
      this.previewHeight = 400 / ratio;
    } else {
      this.previewHeight = 400;
      this.previewWidth = 400 * ratio;
    }
  }

  async generateTiles() {
    if (!this.imageSrc()) return;
    this.generating.set(true);

    const img = new Image();
    img.src = this.imageSrc()!;
    await img.decode();

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;

    const tileWidth = img.width / this.cols();
    const tileHeight = img.height / this.rows();
    canvas.width = tileWidth;
    canvas.height = tileHeight;

    const zip = new JSZip();

    for (let r = 0; r < this.rows(); r++) {
      for (let c = 0; c < this.cols(); c++) {
        ctx.clearRect(0, 0, tileWidth, tileHeight);
        ctx.drawImage(img, c * tileWidth, r * tileHeight, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          zip.file(`tile_${r}_${c}.png`, blob);
        }
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mosaic_tiles.zip';
    link.click();

    this.generating.set(false);
  }
}
