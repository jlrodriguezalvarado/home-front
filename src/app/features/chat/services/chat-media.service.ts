import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { apiUrl } from '../../../core/api/api-url';
import { API_ENDPOINTS } from '../../../core/api/endpoints';
import { ChatMediaUploadResponse } from '../models/chat.models';
import { mapChatMediaUploadFromApi } from '../mappers/chat.mapper';

export interface ChatMediaUploadProgress {
  progress: number;
  response?: ChatMediaUploadResponse;
}

@Injectable({ providedIn: 'root' })
export class ChatMediaService {
  private readonly http = inject(HttpClient);

  uploadMedia(conversationId: string, file: File): Observable<ChatMediaUploadProgress> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<unknown>(
      apiUrl(API_ENDPOINTS.chat.conversations.media(conversationId)),
      formData,
      { reportProgress: true, observe: 'events' },
    ).pipe(
      map((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const total = event.total ?? file.size;
          const progress = total > 0 ? Math.round((event.loaded / total) * 100) : 0;
          return { progress };
        }
        if (event.type === HttpEventType.Response) {
          return {
            progress: 100,
            response: mapChatMediaUploadFromApi(event.body),
          };
        }
        return { progress: 0 };
      }),
      filter((item) => item.progress > 0 || item.response != null),
      map((item) => {
        if (item.response) return item;
        return { progress: item.progress };
      }),
    );
  }

  mapUploadError(error: unknown): 'chatMediaTypeNotSupported' | 'chatMediaFileTooLarge' | 'chatMediaUploadFailed' {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        const body = error.error;
        const detail = typeof body === 'object' && body != null
          ? String((body as Record<string, unknown>)['detail'] ?? (body as Record<string, unknown>)['message'] ?? '')
          : String(body ?? '');
        const normalized = detail.toLowerCase();
        if (normalized.includes('size') || normalized.includes('large') || normalized.includes('big')) {
          return 'chatMediaFileTooLarge';
        }
        if (normalized.includes('type') || normalized.includes('format') || normalized.includes('support')) {
          return 'chatMediaTypeNotSupported';
        }
      }
    }
    return 'chatMediaUploadFailed';
  }

  toUploadError$(error: unknown): Observable<never> {
    return throwError(() => this.mapUploadError(error));
  }
}
