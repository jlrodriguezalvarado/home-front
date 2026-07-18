import { environment } from '../../../environments/environment';

/** Join base API URL with a path without duplicating /api/. */
export function apiUrl(path: string): string {
  const base = environment.apiUrl.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** Resolve media URLs: prefer signed public_image; fallback to /media/{path}. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const origin = environment.apiUrl.replace(/\/api\/?$/, '');
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${origin}/media/${normalized}`;
}
