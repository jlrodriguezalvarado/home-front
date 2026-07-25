import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { FinanceWorkspaceService } from './finance-workspace.service';
import { AuthService } from '../../../core/auth/auth.service';
import { apiUrl } from '../../../core/api/api-url';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { writeFinanceWorkspaceId } from '../finance-workspace.storage';

describe('FinanceWorkspaceService', () => {
  let service: FinanceWorkspaceService;
  let httpMock: HttpTestingController;
  const loggedOut$ = new Subject<void>();

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: { loggedOut$: loggedOut$.asObservable() } },
      ],
    });
    service = TestBed.inject(FinanceWorkspaceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should use stored workspace id when still in list', () => {
    writeFinanceWorkspaceId('ws-2');
    service.resolveActiveId().subscribe((id) => {
      expect(id).toBe('ws-2');
    });
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.workspaces));
    req.flush([
      { id: 'ws-1', name: 'A', kind: 'personal' },
      { id: 'ws-2', name: 'B', kind: 'shared' },
    ]);
  });

  it('should fall back to first workspace when stored id is missing', () => {
    service.resolveActiveId().subscribe((id) => {
      expect(id).toBe('ws-1');
    });
    const req = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.workspaces));
    req.flush([{ id: 'ws-1', name: 'Personal', kind: 'personal' }]);
  });

  it('should create a personal workspace when list is empty', () => {
    service.resolveActiveId().subscribe((id) => {
      expect(id).toBe('ws-new');
    });
    const listReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.workspaces));
    expect(listReq.request.method).toBe('GET');
    listReq.flush([]);
    const createReq = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.workspaces));
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual({ name: 'Personal', kind: 'personal' });
    createReq.flush({ id: 'ws-new', name: 'Personal', kind: 'personal' });
  });

  it('should clear cache on logout', () => {
    service.resolveActiveId().subscribe();
    const first = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.workspaces));
    first.flush([{ id: 'ws-1', name: 'Personal', kind: 'personal' }]);
    loggedOut$.next();
    service.resolveActiveId().subscribe((id) => {
      expect(id).toBe('ws-2');
    });
    const second = httpMock.expectOne((r) => r.url === apiUrl(API_ENDPOINTS.finance.workspaces));
    second.flush([{ id: 'ws-2', name: 'Other', kind: 'personal' }]);
  });
});
