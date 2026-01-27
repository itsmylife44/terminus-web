import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPtyBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_OPENCODE_URL) {
    return process.env.NEXT_PUBLIC_OPENCODE_URL;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:3001';
}

/**
 * Read authentication credentials from sessionStorage
 * @returns Object with username and password, or null if not found/invalid
 */
export function getAuthCredentials(): { username: string; password: string } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const authData = sessionStorage.getItem('opencode_auth');
  if (!authData) {
    return null;
  }

  try {
    const parsed = JSON.parse(authData);
    if (parsed.username && parsed.password) {
      return { username: parsed.username, password: parsed.password };
    }
    return null;
  } catch (e) {
    // Silent fail on malformed JSON
    return null;
  }
}

/**
 * Generate HTTP Basic Authentication header value
 * @returns Authorization header value (e.g., "Basic dXNlcm5hbWU6cGFzc3dvcmQ=") or null if no credentials
 */
export function getBasicAuthHeader(): string | null {
  const credentials = getAuthCredentials();
  if (!credentials) {
    return null;
  }

  const encoded = btoa(`${credentials.username}:${credentials.password}`);
  return `Basic ${encoded}`;
}

/**
 * Embed credentials in WebSocket URL for authentication
 * @param baseUrl Base WebSocket URL (e.g., "wss://example.com/pty/connect")
 * @returns WebSocket URL with embedded credentials, or original URL if no credentials
 */
export function getAuthenticatedWsUrl(baseUrl: string): string {
  const credentials = getAuthCredentials();
  if (!credentials) {
    return baseUrl;
  }

  try {
    const url = new URL(baseUrl);
    url.username = encodeURIComponent(credentials.username);
    url.password = encodeURIComponent(credentials.password);
    return url.toString();
  } catch (e) {
    // If URL parsing fails, return original URL
    return baseUrl;
  }
}
