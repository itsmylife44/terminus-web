/**
 * PTY Sessions Database Operations
 * CRUD operations for managing PTY terminal sessions
 */

import { getDb } from './index';
import type {
  PtySessionStatus,
  PtySession,
  CreatePtySessionInput,
  UpdatePtySessionInput,
} from '@/lib/types/pty-sessions';

// Re-export types for backward compatibility
export type {
  PtySessionStatus,
  PtySession,
  CreatePtySessionInput,
  UpdatePtySessionInput,
} from '@/lib/types/pty-sessions';

/**
 * Get all PTY sessions, optionally filtered by status
 */
export function getAllPtySessions(status?: PtySessionStatus): PtySession[] {
  const db = getDb();

  if (status) {
    const stmt = db.prepare(`
      SELECT * FROM pty_sessions 
      WHERE status = ? 
      ORDER BY last_connected_at DESC
    `);
    return stmt.all(status) as PtySession[];
  }

  const stmt = db.prepare(`
    SELECT * FROM pty_sessions 
    ORDER BY last_connected_at DESC
  `);
  return stmt.all() as PtySession[];
}

/**
 * Get active sessions (not closed)
 */
export function getActivePtySessions(): PtySession[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM pty_sessions 
    WHERE status != 'closed' 
    ORDER BY last_connected_at DESC
  `);
  return stmt.all() as PtySession[];
}

/**
 * Get sessions that were active within the last N minutes
 */
export function getRecentlyActiveSessions(minutesAgo: number = 5): PtySession[] {
  const db = getDb();
  const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

  const stmt = db.prepare(`
    SELECT * FROM pty_sessions 
    WHERE status = 'active' 
      AND last_connected_at > ?
    ORDER BY last_connected_at DESC
  `);

  return stmt.all(cutoffTime) as PtySession[];
}

/**
 * Get a single PTY session by ID
 */
export function getPtySession(id: string): PtySession | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM pty_sessions WHERE id = ?');
  return stmt.get(id) as PtySession | null;
}

/**
 * Create or update a PTY session (UPSERT pattern)
 * If session with ID exists, updates it instead of failing
 */
export function createPtySession(input: CreatePtySessionInput): PtySession {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO pty_sessions (id, pty_id, title, cols, rows, status, last_connected_at)
    VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      pty_id = excluded.pty_id,
      status = 'active',
      last_connected_at = datetime('now'),
      cols = excluded.cols,
      rows = excluded.rows
  `);

  stmt.run(input.id, input.pty_id, input.title || 'Terminal', input.cols || 80, input.rows || 24);

  const session = getPtySession(input.id);
  if (!session) {
    throw new Error(`Failed to retrieve PTY session after creation: ${input.id}`);
  }
  return session;
}

/**
 * Update a PTY session
 */
export function updatePtySession(id: string, input: UpdatePtySessionInput): PtySession | null {
  const db = getDb();

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }

  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }

  if (input.last_connected_at !== undefined) {
    updates.push('last_connected_at = ?');
    values.push(input.last_connected_at);
  } else if (input.status === 'active') {
    // Auto-update last_connected_at when becoming active
    updates.push("last_connected_at = datetime('now')");
  }

  if (input.cols !== undefined) {
    updates.push('cols = ?');
    values.push(input.cols);
  }

  if (input.rows !== undefined) {
    updates.push('rows = ?');
    values.push(input.rows);
  }

  if (updates.length === 0) {
    return getPtySession(id);
  }

  values.push(id);

  const stmt = db.prepare(`
    UPDATE pty_sessions 
    SET ${updates.join(', ')} 
    WHERE id = ?
  `);

  stmt.run(...values);

  return getPtySession(id);
}

/**
 * Update only the title of a PTY session
 * Used specifically for rename functionality
 */
export function updateSessionTitle(id: string, title: string): PtySession | null {
  const db = getDb();

  // Validate title is not empty and within reasonable length
  if (!title || title.trim() === '' || title.length > 100) {
    throw new Error('Invalid title: must be 1-100 characters');
  }

  const stmt = db.prepare(`
    UPDATE pty_sessions 
    SET title = ? 
    WHERE id = ?
  `);

  stmt.run(title.trim(), id);

  return getPtySession(id);
}

/**
 * Delete a PTY session
 */
export function deletePtySession(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM pty_sessions WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}
