import { HttpErrorResponse } from '@angular/common/http';

export type AppFieldErrors = Record<string, string[]>;

interface AppErrorOptions {
  code: string;
  message: string;
  status: number;
  fieldErrors?: AppFieldErrors;
  details?: unknown;
  requestId?: string | null;
}

export class AppError extends Error {
  override readonly name = 'AppError';
  readonly code: string;
  readonly status: number;
  readonly fieldErrors: AppFieldErrors;
  readonly details: unknown;
  readonly requestId: string | null;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.code = options.code;
    this.status = options.status;
    this.fieldErrors = options.fieldErrors ?? {};
    this.details = options.details ?? null;
    this.requestId = options.requestId ?? null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function collectMessages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectMessages(item));
  }
  if (isRecord(value)) {
    return Object.values(value).flatMap((item) => collectMessages(item));
  }
  if (value == null) return [];
  const message = String(value).trim();
  return message ? [message] : [];
}

function normalizeFieldErrors(value: unknown): AppFieldErrors {
  if (!isRecord(value)) return {};
  const normalized: AppFieldErrors = {};
  for (const [field, messages] of Object.entries(value)) {
    const values = collectMessages(messages);
    if (values.length) normalized[field] = values;
  }
  return normalized;
}

function legacyFieldErrors(body: Record<string, unknown>): AppFieldErrors {
  const ignored = new Set(['code', 'message', 'detail', 'details', 'request_id']);
  return normalizeFieldErrors(
    Object.fromEntries(Object.entries(body).filter(([key]) => !ignored.has(key))),
  );
}

function firstFieldMessage(fieldErrors: AppFieldErrors): string | null {
  for (const messages of Object.values(fieldErrors)) {
    if (messages.length) return messages[0];
  }
  return null;
}

function statusCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'validation_error',
    401: 'not_authenticated',
    403: 'permission_denied',
    404: 'not_found',
    405: 'method_not_allowed',
    409: 'conflict',
    429: 'throttled',
  };
  return status === 0 ? 'network_error' : (codes[status] ?? 'http_error');
}

function fallbackMessage(status: number): string {
  if (status === 0) return 'Unable to connect to the server.';
  if (status === 401) return 'Your session has expired.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource was not found.';
  return 'The request could not be completed.';
}

export function normalizeAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof HttpErrorResponse) {
    const body = isRecord(error.error) ? error.error : null;
    const envelopeFields = normalizeFieldErrors(body?.['field_errors']);
    const fieldErrors = Object.keys(envelopeFields).length
      ? envelopeFields
      : body
        ? legacyFieldErrors(body)
        : {};
    const message =
      nonEmptyString(body?.['message']) ??
      nonEmptyString(body?.['detail']) ??
      (typeof error.error === 'string' ? nonEmptyString(error.error) : null) ??
      firstFieldMessage(fieldErrors) ??
      fallbackMessage(error.status);
    const requestId =
      nonEmptyString(body?.['request_id']) ?? nonEmptyString(error.headers?.get('X-Request-ID'));

    return new AppError({
      code: nonEmptyString(body?.['code']) ?? statusCode(error.status),
      message,
      status: error.status,
      fieldErrors,
      details: body?.['details'] ?? null,
      requestId,
    });
  }

  if (error instanceof Error) {
    return new AppError({
      code: 'client_error',
      message: error.message || fallbackMessage(0),
      status: 0,
    });
  }

  return new AppError({
    code: 'unknown_error',
    message: fallbackMessage(0),
    status: 0,
  });
}
