import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ApiService } from '../api/api.service';
import { AuthService, AuthTokens } from './auth.service';

describe('AuthService', () => {
  const api = jasmine.createSpyObj<ApiService>('ApiService', ['post']);

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    api.post.calls.reset();
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: api }],
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('clears tokens and user-scoped data while preserving device preferences', () => {
    localStorage.setItem('access_token', 'access');
    localStorage.setItem('refresh_token', 'refresh');
    sessionStorage.setItem('access_token', 'session-access');
    sessionStorage.setItem('refresh_token', 'session-refresh');
    localStorage.setItem('shopping_cart_items_v4', '[{"product":1}]');
    localStorage.setItem('home_finance_period_v1', '{"year":2026,"month":7}');
    localStorage.setItem('home_finance_workspace_v1', '{"id":"ws-1"}');
    localStorage.setItem('products_list_filters_v1', '{"search":"private"}');
    localStorage.setItem('chat_recent_emojis', '["🔒"]');
    localStorage.setItem('app_theme', 'dark');
    localStorage.setItem('app_lang', 'es');
    const service = TestBed.inject(AuthService);

    service.logout();

    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(sessionStorage.getItem('access_token')).toBeNull();
    expect(sessionStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('shopping_cart_items_v4')).toBeNull();
    expect(localStorage.getItem('home_finance_period_v1')).toBeNull();
    expect(localStorage.getItem('home_finance_workspace_v1')).toBeNull();
    expect(localStorage.getItem('products_list_filters_v1')).toBeNull();
    expect(localStorage.getItem('chat_recent_emojis')).toBeNull();
    expect(localStorage.getItem('app_theme')).toBe('dark');
    expect(localStorage.getItem('app_lang')).toBe('es');
  });

  it('notifies active sessions to disconnect', () => {
    const service = TestBed.inject(AuthService);
    const loggedOut = jasmine.createSpy('loggedOut');
    service.loggedOut$.subscribe(loggedOut);

    service.logout();

    expect(loggedOut).toHaveBeenCalledTimes(1);
  });

  it('shares one refresh request across concurrent subscribers', () => {
    localStorage.setItem('refresh_token', 'refresh-1');
    const refreshResponse = new Subject<AuthTokens>();
    api.post.and.returnValue(refreshResponse);
    const service = TestBed.inject(AuthService);
    const first = jasmine.createSpy('first');
    const second = jasmine.createSpy('second');

    service.refreshToken().subscribe(first);
    service.refreshToken().subscribe(second);

    expect(api.post).toHaveBeenCalledTimes(1);
    refreshResponse.next({ access: 'access-2', refresh: 'rotated-refresh' });
    refreshResponse.complete();
    expect(first).toHaveBeenCalledWith({ access: 'access-2', refresh: 'rotated-refresh' });
    expect(second).toHaveBeenCalledWith({ access: 'access-2', refresh: 'rotated-refresh' });

    api.post.and.returnValue(of({ access: 'access-3', refresh: 'ignored-refresh' }));
    service.refreshToken().subscribe();
    expect(api.post).toHaveBeenCalledTimes(2);
  });
});
