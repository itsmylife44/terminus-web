/**
 * PTY Session Type Definitions
 *
 * Centralized types used by both API and DB layers.
 * Uses superset approach: includes all fields from both layers.
 * DB-only fields are marked as optional and documented.
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

  /** DB-only: Client ID for tmux session management */
  last_client_id?: string;

  /** DB-only: Associated tmux session name */
  tmux_session_name?: string;
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

  /** DB-only: Update last connected timestamp */
  last_connected_at?: string;
}
