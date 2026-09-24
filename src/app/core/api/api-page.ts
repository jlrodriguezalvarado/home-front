import { PaginatedResponse } from './models';

export type ApiListResponse<T> = T[] | PaginatedResponse<T>;

export function apiListResults<T>(response: ApiListResponse<T>): T[] {
  return Array.isArray(response) ? response : response.results;
}

export function normalizeApiPage<T>(response: ApiListResponse<T>): PaginatedResponse<T> {
  if (!Array.isArray(response)) return response;
  return {
    count: response.length,
    next: null,
    previous: null,
    results: response,
  };
}
