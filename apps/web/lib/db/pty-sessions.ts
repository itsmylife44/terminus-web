/**
 * PTY Sessions Database Operations
 * CRUD operations for managing PTY terminal sessions
 */

import { getDb } from './index';

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
  last_connected_at?: string;
  cols?: number;
  rows?: number;
}

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
 * Get a single PTY session by ID
 */
export function getPtySession(id: string): PtySession | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM pty_sessions WHERE id = ?');
  return stmt.get(id) as PtySession | null;
}

/**
 * Create a new PTY session
 */
export function createPtySession(input: CreatePtySessionInput): PtySession {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO pty_sessions (id, pty_id, title, cols, rows)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(input.id, input.pty_id, input.title || 'Terminal', input.cols || 80, input.rows || 24);

  return getPtySession(input.id)!;
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
 * Delete a PTY session
 */
export function deletePtySession(id: string): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM pty_sessions WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}
