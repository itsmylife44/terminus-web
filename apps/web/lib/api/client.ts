/**
 * @file client.ts
 * @description API Client for OpenCode Serve API
 * Handles authentication, base URL configuration, and typed API methods.
 */

export interface OpenCodeConfig {
  version: string;
  // Add other config properties as needed based on actual API response
  [key: string]: unknown;
}

export interface OpenCodeSession {
  id: string;
  // Add other session properties as needed
  [key: string]: unknown;
}

export interface OpenCodeProvider {
  id: string;
  name: string;
  // Add other provider properties as needed
  [key: string]: unknown;
}

export class OpenCodeAPIClient {
  private static instance: OpenCodeAPIClient;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_OPENCODE_URL || 'http://localhost:3001';
  }

  /**
   * Get the singleton instance of the API client
   */
  public static getInstance(): OpenCodeAPIClient {
    if (!OpenCodeAPIClient.instance) {
      OpenCodeAPIClient.instance = new OpenCodeAPIClient();
    }
    return OpenCodeAPIClient.instance;
  }

  /**
   * Get authentication headers including Basic Auth if credentials exist in sessionStorage
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      const authData = sessionStorage.getItem('opencode_auth');
      if (authData) {
        try {
          const { username, password } = JSON.parse(authData);
          if (username && password) {
            const credentials = btoa(`${username}:${password}`);
            headers['Authorization'] = `Basic ${credentials}`;
          }
        } catch (e) {
          console.error('Failed to parse auth credentials', e);
        }
      }
    }

    return headers;
  }

  /**
   * Handle API responses, checking for 401 Unauthorized
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      // Dispatch auth error event for the application to handle
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('opencode:auth_error'));
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    // Some endpoints might return empty body on success
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  /**
   * Check system health
   * @returns Promise resolving to true if healthy
   */
  public async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/global/health`, {
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error('Health check failed', error);
      return false;
    }
  }

  /**
   * Get current configuration
   */
  public async getConfig(): Promise<OpenCodeConfig> {
    const response = await fetch(`${this.baseUrl}/config`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<OpenCodeConfig>(response);
  }

  /**
   * Get list of active sessions
   * @param limit Max number of sessions to return
   * @param offset Offset for pagination
   */
  public async getSessions(limit?: number, offset?: number): Promise<OpenCodeSession[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${this.baseUrl}/session${queryString}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<OpenCodeSession[]>(response);
  }

  /**
   * Get list of available providers
   */
  public async getProviders(): Promise<OpenCodeProvider[]> {
    const response = await fetch(`${this.baseUrl}/provider`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<OpenCodeProvider[]>(response);
  }
}

export const openCodeClient = OpenCodeAPIClient.getInstance();
