import {
  Directive,
  ElementRef,
  Input,
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
  @Input() appPullToRefresh = true;
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
  private touchTarget: EventTarget | null = null;
  private readonly touchStartHandler = (event: TouchEvent) => this.onTouchStart(event);
  private readonly touchMoveHandler = (event: TouchEvent) => this.onTouchMove(event);
  private readonly touchEndHandler = () => this.onTouchEnd();
  readonly refreshing = signal(false);

  ngOnInit(): void {
    if (!this.appPullToRefresh) {
      return;
    }
    const host = this.el.nativeElement;
    this.renderer.setStyle(host, 'overscroll-behavior-y', 'contain');
    this.createIndicator();
    host.addEventListener('touchstart', this.touchStartHandler, { passive: true });
    host.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    host.addEventListener('touchend', this.touchEndHandler, { passive: true });
    host.addEventListener('touchcancel', this.touchEndHandler, { passive: true });
  }

  ngOnDestroy(): void {
    const host = this.el.nativeElement;
    host.removeEventListener('touchstart', this.touchStartHandler);
    host.removeEventListener('touchmove', this.touchMoveHandler);
    host.removeEventListener('touchend', this.touchEndHandler);
    host.removeEventListener('touchcancel', this.touchEndHandler);
    this.indicator?.remove();
  }

  private onTouchStart(event: TouchEvent): void {
    if (this.refreshing()) {
      return;
    }
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    this.touchTarget = event.target;
    if (!this.canPullFromTarget(this.touchTarget)) {
      return;
    }
    this.startY = touch.clientY;
    this.pulling = true;
    this.touchId = touch.identifier;
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.pulling || this.refreshing()) {
      return;
    }
    const touch = this.findTouch(event);
    if (!touch) {
      return;
    }
    if (!this.canPullFromTarget(this.touchTarget)) {
      this.resetPull();
      return;
    }
    const delta = touch.clientY - this.startY;
    if (delta <= 0) {
      this.resetPull();
      return;
    }
    event.preventDefault();
    this.pullDistance = Math.min(delta * PULL_RESISTANCE, MAX_PULL);
    this.updateIndicator();
  }

  private onTouchEnd(): void {
    if (!this.pulling) {
      return;
    }
    const shouldRefresh = this.pullDistance >= PULL_THRESHOLD;
    this.pulling = false;
    this.touchId = null;
    this.touchTarget = null;
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

  private canPullFromTarget(target: EventTarget | null): boolean {
    const host = this.el.nativeElement;
    let node = target as HTMLElement | null;
    while (node && host.contains(node)) {
      if (this.isScrollable(node) && node.scrollTop > 1) {
        return false;
      }
      node = node.parentElement;
    }
    return host.scrollTop <= 1;
  }

  private isScrollable(element: HTMLElement): boolean {
    const style = getComputedStyle(element);
    const overflowY = style.overflowY;
    if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') {
      return false;
    }
    return element.scrollHeight > element.clientHeight + 1;
  }

  private findTouch(event: TouchEvent): Touch | null {
    if (this.touchId === null) {
      return event.touches[0] ?? null;
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
    this.renderer.setProperty(this.labelEl, 'textContent', this.i18n.t('pullToRefresh'));
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
    this.pulling = false;
    this.pullDistance = 0;
    if (!this.indicator || !this.iconEl || !this.labelEl) {
      return;
    }
    if (animate) {
      this.renderer.addClass(this.indicator, 'ptr-animate');
      this.renderer.setStyle(this.indicator, 'height', '0px');
      this.renderer.setStyle(this.indicator, 'opacity', '0');
      this.renderer.removeClass(this.iconEl, 'ptr-spin');
      this.renderer.setProperty(this.iconEl, 'textContent', 'arrow_downward');
      this.renderer.setStyle(this.iconEl, 'transform', null);
      this.renderer.setProperty(this.labelEl, 'textContent', this.i18n.t('pullToRefresh'));
      setTimeout(() => this.renderer.removeClass(this.indicator!, 'ptr-animate'), 220);
      return;
    }
    this.updateIndicator();
  }
}
