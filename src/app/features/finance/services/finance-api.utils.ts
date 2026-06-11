import { HttpErrorResponse } from '@angular/common/http';

export function decodeApiList<T extends Record<string, unknown>>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

export function foreignKeyId(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return String((value as Record<string, unknown>)['id'] ?? '');
  }
  return String(value);
}

export function financeApiErrorMessage(error: unknown, lang: 'en' | 'es'): string {
  if (!(error instanceof HttpErrorResponse)) {
    return lang === 'en' ? 'Unexpected error' : 'Error inesperado';
  }
  if (error.status === 400) {
    const body = error.error;
    if (body && typeof body === 'object') {
      const parts = Object.entries(body as Record<string, unknown>)
        .map(([key, value]) => {
          const text = Array.isArray(value) ? value.join(', ') : String(value);
          return `${key}: ${text}`;
        })
        .filter(Boolean);
      if (parts.length) return parts.join(' · ');
    }
    return lang === 'en' ? 'Validation error' : 'Error de validación';
  }
  if (error.status === 404) {
    return lang === 'en' ? 'Resource not found' : 'Recurso no encontrado';
  }
  if (error.status === 401) {
    return lang === 'en' ? 'Session expired' : 'Sesión expirada';
  }
  return lang === 'en' ? 'Request failed' : 'La solicitud falló';
}
