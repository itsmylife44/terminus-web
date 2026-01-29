/**
 * Generic API request utility
 *
 * Standardized fetch wrapper with:
 * - Type-safe response handling
 * - Automatic auth header injection
 * - Consistent error handling
 * - JSON parsing
 */

import { getBasicAuthHeader } from '../utils';

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiRequest<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { skipAuth = false, headers = {}, ...restOptions } = options;

  // Inject auth header if available and not skipped
  const authHeader = skipAuth ? {} : getBasicAuthHeader() || {};

  const response = await fetch(url, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`
    );
  }

  // Handle empty responses
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(
      `Invalid JSON response: ${error instanceof Error ? error.message : 'Parse error'}`
    );
  }
}
