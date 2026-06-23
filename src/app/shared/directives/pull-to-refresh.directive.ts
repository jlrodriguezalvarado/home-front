import {
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  Renderer2,
  inject,
  signal,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { PwaUpdateService } from '../../core/services/pwa-update.service';

const PULL_THRESHOLD = 72;
const MAX_PULL = 128;
const PULL_RESISTANCE = 0.45;
const REFRESH_INDICATOR_HEIGHT = 48;

@Directive({
  selector: '[appPullToRefresh]',
  standalone: true,
})
export class PullToRefreshDirective implements OnInit, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly pwaUpdate = inject(PwaUpdateService);
  private readonly i18n = inject(I18nService);
  private indicator: HTMLElement | null = null;
  private iconEl: HTMLElement | null = null;
  private labelEl: HTMLElement | null = null;
  private startY = 0;
  private pulling = false;
  private pullDistance = 0;
  private touchId: number | null = null;
  readonly refreshing = signal(false);

  ngOnInit(): void {
    this.renderer.setStyle(this.el.nativeElement, 'overscroll-behavior-y', 'contain');
    this.createIndicator();
  }

  ngOnDestroy(): void {
    this.indicator?.remove();
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (this.refreshing()) {
      return;
    }
    if (this.el.nativeElement.scrollTop > 0) {
      return;
    }
    const touch = event.changedTouches[0];
    this.startY = touch.clientY;
    this.pulling = true;
    this.touchId = touch.identifier;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.pulling || this.refreshing()) {
      return;
    }
    const touch = this.findTouch(event);
    if (!touch) {
      return;
    }
    const delta = touch.clientY - this.startY;
    if (delta <= 0 || this.el.nativeElement.scrollTop > 0) {
      this.resetPull();
      return;
    }
    event.preventDefault();
    this.pullDistance = Math.min(delta * PULL_RESISTANCE, MAX_PULL);
    this.updateIndicator();
  }

  @HostListener('touchend', ['$event'])
  @HostListener('touchcancel', ['$event'])
  onTouchEnd(): void {
    if (!this.pulling) {
      return;
    }
    const shouldRefresh = this.pullDistance >= PULL_THRESHOLD;
    this.pulling = false;
    this.touchId = null;
    if (shouldRefresh) {
      void this.triggerRefresh();
      return;
    }
    this.resetPull(true);
  }

  private async triggerRefresh(): Promise<void> {
    this.refreshing.set(true);
    this.pullDistance = REFRESH_INDICATOR_HEIGHT;
    this.updateIndicator();
    await this.pwaUpdate.refreshApp();
    this.refreshing.set(false);
    this.resetPull(true);
  }

  private findTouch(event: TouchEvent): Touch | null {
    if (this.touchId === null) {
      return event.changedTouches[0] ?? null;
    }
    for (let i = 0; i < event.touches.length; i++) {
      if (event.touches[i].identifier === this.touchId) {
        return event.touches[i];
      }
    }
    return null;
  }

  private createIndicator(): void {
    this.indicator = this.renderer.createElement('div');
    this.renderer.addClass(this.indicator, 'ptr-indicator');
    this.renderer.addClass(this.indicator, 'flex');
    this.renderer.addClass(this.indicator, 'flex-col');
    this.renderer.addClass(this.indicator, 'items-center');
    this.renderer.addClass(this.indicator, 'justify-center');
    this.renderer.addClass(this.indicator, 'gap-0.5');
    this.renderer.addClass(this.indicator, 'overflow-hidden');
    this.renderer.addClass(this.indicator, 'select-none');
    this.renderer.addClass(this.indicator, 'pointer-events-none');
    this.iconEl = this.renderer.createElement('span');
    this.renderer.addClass(this.iconEl, 'material-symbols-outlined');
    this.renderer.addClass(this.iconEl, 'ptr-icon');
    this.renderer.addClass(this.iconEl, 'text-primary');
    this.renderer.addClass(this.iconEl, 'text-[22px]');
    this.renderer.addClass(this.iconEl, 'leading-none');
    this.renderer.setProperty(this.iconEl, 'textContent', 'arrow_downward');
    this.labelEl = this.renderer.createElement('span');
    this.renderer.addClass(this.labelEl, 'ptr-label');
    this.renderer.addClass(this.labelEl, 'text-[11px]');
    this.renderer.addClass(this.labelEl, 'leading-tight');
    this.renderer.addClass(this.labelEl, 'text-on-surface-variant');
    this.renderer.appendChild(this.indicator, this.iconEl);
    this.renderer.appendChild(this.indicator, this.labelEl);
    this.renderer.insertBefore(
      this.el.nativeElement,
      this.indicator,
      this.el.nativeElement.firstChild
    );
  }

  private updateIndicator(): void {
    if (!this.indicator || !this.iconEl || !this.labelEl) {
      return;
    }
    const height = this.refreshing() ? REFRESH_INDICATOR_HEIGHT : this.pullDistance;
    const progress = Math.min(height / PULL_THRESHOLD, 1);
    this.renderer.setStyle(this.indicator, 'height', `${height}px`);
    this.renderer.setStyle(this.indicator, 'opacity', `${progress}`);
    if (this.refreshing()) {
      this.renderer.setProperty(this.iconEl, 'textContent', 'progress_activity');
      this.renderer.addClass(this.iconEl, 'ptr-spin');
      this.renderer.setProperty(this.labelEl, 'textContent', this.i18n.t('checkingUpdate'));
      return;
    }
    this.renderer.removeClass(this.iconEl, 'ptr-spin');
    this.renderer.setProperty(this.iconEl, 'textContent', 'arrow_downward');
    this.renderer.setStyle(this.iconEl, 'transform', `rotate(${progress * 180}deg)`);
    this.renderer.setProperty(
      this.labelEl,
      'textContent',
      height >= PULL_THRESHOLD ? this.i18n.t('releaseToRefresh') : this.i18n.t('pullToRefresh')
    );
  }

  private resetPull(animate = false): void {
    this.pullDistance = 0;
    if (!this.indicator) {
      return;
    }
    if (animate) {
      this.renderer.addClass(this.indicator, 'ptr-animate');
      setTimeout(() => this.renderer.removeClass(this.indicator!, 'ptr-animate'), 220);
    }
    this.updateIndicator();
  }
}
