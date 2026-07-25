import { HttpClient, HttpErrorResponse, HttpHeaders, withXhr } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppError, normalizeAppError } from './app-error';
import { appErrorInterceptor } from './app-error.interceptor';

describe('AppError', () => {
  it('normalizes the API envelope and its request ID', () => {
    const error = new HttpErrorResponse({
      status: 400,
      headers: new HttpHeaders({ 'X-Request-ID': 'header-request' }),
      error: {
        code: 'validation_error',
        message: 'Invalid data.',
        field_errors: { name: ['Required.'] },
        details: null,
        request_id: 'body-request',
      },
    });

    const result = normalizeAppError(error);

    expect(result).toBeInstanceOf(AppError);
    expect(result.code).toBe('validation_error');
    expect(result.status).toBe(400);
    expect(result.message).toBe('Invalid data.');
    expect(result.fieldErrors).toEqual({ name: ['Required.'] });
    expect(result.requestId).toBe('body-request');
  });

  it('keeps supporting legacy detail and field responses', () => {
    const detailError = normalizeAppError(
      new HttpErrorResponse({ status: 404, error: { detail: 'Missing item.' } }),
    );
    const fieldsError = normalizeAppError(
      new HttpErrorResponse({
        status: 400,
        error: { current_password: ['Incorrect password.'] },
      }),
    );

    expect(detailError.message).toBe('Missing item.');
    expect(detailError.code).toBe('not_found');
    expect(fieldsError.fieldErrors).toEqual({
      current_password: ['Incorrect password.'],
    });
    expect(fieldsError.message).toBe('Incorrect password.');
  });

  it('uses a safe network error when there is no server response', () => {
    const result = normalizeAppError(new HttpErrorResponse({ status: 0 }));

    expect(result.code).toBe('network_error');
    expect(result.status).toBe(0);
    expect(result.message).toBe('Unable to connect to the server.');
  });
});

describe('appErrorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr(), withInterceptors([appErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('emits AppError instead of HttpErrorResponse', () => {
    let received: unknown;
    http.get('/test').subscribe({ error: (error) => (received = error) });

    controller.expectOne('/test').flush(
      { detail: 'Legacy conflict.' },
      {
        status: 409,
        statusText: 'Conflict',
        headers: { 'X-Request-ID': 'interceptor-request' },
      },
    );

    expect(received).toBeInstanceOf(AppError);
    expect((received as AppError).code).toBe('conflict');
    expect((received as AppError).requestId).toBe('interceptor-request');
  });
});
