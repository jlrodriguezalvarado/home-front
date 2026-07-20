import { normalizeAppError } from '../../../core/api/app-error';

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
  const appError = normalizeAppError(error);
  if (appError.status === 400) {
    const parts = Object.entries(appError.fieldErrors).map(
      ([key, messages]) => `${key}: ${messages.join(', ')}`,
    );
    if (parts.length) return parts.join(' · ');
    return lang === 'en' ? 'Validation error' : 'Error de validación';
  }
  if (appError.status === 404) {
    return lang === 'en' ? 'Resource not found' : 'Recurso no encontrado';
  }
  if (appError.status === 401) {
    return lang === 'en' ? 'Session expired' : 'Sesión expirada';
  }
  if (appError.status === 0 && appError.code !== 'network_error') {
    return lang === 'en' ? 'Unexpected error' : 'Error inesperado';
  }
  return lang === 'en' ? 'Request failed' : 'La solicitud falló';
}
