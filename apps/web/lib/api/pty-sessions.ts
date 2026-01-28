/**
 * PTY Sessions API Client
 * Client-side functions for managing PTY terminal sessions
 */

export type PtySessionStatus = 'active' | 'disconnected' | 'closed';

export interface PtySession {
  id: string;
  pty_id: string;
  title: string;
  status: PtySessionStatus;
  created_at: string;
  last_connected_at: string;
  cols: number;
  rows: number;
  occupied?: boolean;
}

export interface CreatePtySessionInput {
  id: string;
  pty_id: string;
  title?: string;
  cols?: number;
  rows?: number;
}

export interface UpdatePtySessionInput {
  title?: string;
  status?: PtySessionStatus;
  cols?: number;
  rows?: number;
}

const API_BASE = '/api/pty-sessions';

/**
 * Fetch all active PTY sessions
 */
export async function fetchPtySessions(includeAll = false): Promise<PtySession[]> {
  const url = includeAll ? `${API_BASE}?all=true` : API_BASE;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch PTY sessions');
  }

  return response.json();
}

/**
 * Fetch a single PTY session by ID
 */
export async function fetchPtySession(id: string): Promise<PtySession | null> {
  const response = await fetch(`${API_BASE}/${id}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch PTY session');
  }

  return response.json();
}

/**
 * Create a new PTY session record
 */
export async function createPtySession(input: CreatePtySessionInput): Promise<PtySession> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to create PTY session');
  }

  return response.json();
}

/**
 * Update a PTY session
 */
export async function updatePtySession(
  id: string,
  input: UpdatePtySessionInput
): Promise<PtySession> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to update PTY session');
  }

  return response.json();
}

/**
 * Delete a PTY session
 */
export async function deletePtySession(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    throw new Error('Failed to delete PTY session');
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
 * Take over an occupied session by disconnecting other clients
 */
export async function takeoverPtySession(ptyId: string): Promise<void> {
  const response = await fetch(`/pty/${ptyId}/takeover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to take over session');
  }
}
