/**
 * PTY Sessions API Client
 * Client-side functions for managing PTY terminal sessions
 */

import { apiRequest } from '@/lib/utils/api-request';
import type {
  PtySessionStatus,
  PtySession,
  CreatePtySessionInput,
  UpdatePtySessionInput,
} from '@/lib/types/pty-sessions';

export type { PtySessionStatus, PtySession, CreatePtySessionInput, UpdatePtySessionInput };

const API_BASE = '/api/pty-sessions';

/**
 * Fetch all active PTY sessions
 */
export async function fetchPtySessions(includeAll = false): Promise<PtySession[]> {
  const url = includeAll ? `${API_BASE}?all=true` : API_BASE;
  return apiRequest<PtySession[]>(url);
}

/**
 * Fetch a single PTY session by ID
 */
export async function fetchPtySession(id: string): Promise<PtySession | null> {
  try {
    return await apiRequest<PtySession>(`${API_BASE}/${id}`);
  } catch (error) {
    // Check if it's a 404 error
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Create a new PTY session record
 */
export async function createPtySession(input: CreatePtySessionInput): Promise<PtySession> {
  return apiRequest<PtySession>(API_BASE, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Update a PTY session
 */
export async function updatePtySession(
  id: string,
  input: UpdatePtySessionInput
): Promise<PtySession> {
  return apiRequest<PtySession>(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

/**
 * Delete a PTY session
 */
export async function deletePtySession(id: string): Promise<void> {
  try {
    await apiRequest<void>(`${API_BASE}/${id}`, { method: 'DELETE' });
  } catch (error) {
    // 404 is acceptable (session already deleted)
    if (error instanceof Error && error.message.includes('404')) {
      return;
    }
    throw error;
  }
}

/**
 * Mark a session as disconnected
 */
export async function disconnectPtySession(id: string): Promise<PtySession> {
  return updatePtySession(id, { status: 'disconnected' });
}

/**
 * Mark a session as closed
 */
export async function closePtySession(id: string): Promise<PtySession> {
  return updatePtySession(id, { status: 'closed' });
}

/**
 * Reactivate a session (mark as active)
 */
export async function reactivatePtySession(id: string): Promise<PtySession> {
  return updatePtySession(id, { status: 'active' });
}

/**
 * Rename a PTY session
 */
export async function renamePtySession(id: string, title: string): Promise<PtySession> {
  return apiRequest<PtySession>(`${API_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

/**
 * Take over an occupied session by disconnecting other clients
 */
export async function takeoverPtySession(ptyId: string): Promise<void> {
  await apiRequest<void>(`/pty/${ptyId}/takeover`, { method: 'POST' });
}
