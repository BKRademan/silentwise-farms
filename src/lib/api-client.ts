import type { ApiResponse } from '@/lib/api-utils';

/** Calls a `handleApiRoute` endpoint and returns `data`, throwing the server's error message on failure. */
export async function apiRequest<T>(
  url: string,
  options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = await response.json();
  } catch {
    // non-JSON response, handled below
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }
  return payload.data as T;
}
