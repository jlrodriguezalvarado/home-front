import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { AuthService } from '../../../core/auth/auth.service';
import {
  readFinanceWorkspaceId,
  writeFinanceWorkspaceId,
} from '../finance-workspace.storage';
import { decodeApiList } from './finance-api.utils';

export interface FinanceWorkspace {
  id: string;
  name: string;
  kind: string;
}

const DEFAULT_PERSONAL_NAME = 'Personal';

@Injectable({
  providedIn: 'root',
})
export class FinanceWorkspaceService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private cachedId: string | null = null;
  private resolve$: Observable<string> | null = null;

  constructor() {
    this.auth.loggedOut$.subscribe(() => this.clearCache());
  }

  list(): Observable<FinanceWorkspace[]> {
    return this.api
      .get<unknown>(API_ENDPOINTS.finance.workspaces, { params: { perPage: '200' } })
      .pipe(
        map((res) =>
          decodeApiList<Record<string, unknown>>(res).map((item) => this.mapWorkspace(item)),
        ),
      );
  }

  resolveActiveId(): Observable<string> {
    if (this.cachedId) return of(this.cachedId);
    if (!this.resolve$) {
      this.resolve$ = this.loadAndResolve().pipe(
        tap({
          next: (id) => {
            this.cachedId = id;
            writeFinanceWorkspaceId(id);
          },
          error: () => {
            this.resolve$ = null;
          },
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.resolve$;
  }

  clearCache(): void {
    this.cachedId = null;
    this.resolve$ = null;
  }

  private loadAndResolve(): Observable<string> {
    return this.list().pipe(
      switchMap((workspaces) => {
        if (workspaces.length === 0) {
          return this.createPersonalWorkspace().pipe(map((ws) => ws.id));
        }
        const stored = readFinanceWorkspaceId();
        const match = stored ? workspaces.find((ws) => ws.id === stored) : undefined;
        return of(match?.id ?? workspaces[0].id);
      }),
    );
  }

  private createPersonalWorkspace(): Observable<FinanceWorkspace> {
    return this.api
      .post<Record<string, unknown>>(API_ENDPOINTS.finance.workspaces, {
        name: DEFAULT_PERSONAL_NAME,
        kind: 'personal',
      })
      .pipe(map((res) => this.mapWorkspace(res)));
  }

  private mapWorkspace(raw: Record<string, unknown>): FinanceWorkspace {
    return {
      id: String(raw['id'] ?? ''),
      name: String(raw['name'] ?? ''),
      kind: String(raw['kind'] ?? 'personal'),
    };
  }
}
