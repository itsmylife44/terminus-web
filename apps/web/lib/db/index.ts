/**
 * SQLite Database Connection
 * Uses better-sqlite3 for synchronous SQLite operations
 */

import Database from 'better-sqlite3';
import path from 'path';

// Database file location - in the data directory
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'terminus.db');

// Singleton database instance
let db: Database.Database | null = null;

/**
 * Get the database instance, creating it if it doesn't exist
 */
export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    const fs = require('fs');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);

    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');

    // Initialize schema
    initSchema(db);
  }
  return db;
}

/**
 * Initialize database schema
 */
function initSchema(db: Database.Database): void {
  db.exec(`
    -- Existing PTY session management table
    CREATE TABLE IF NOT EXISTS pty_sessions (
      id TEXT PRIMARY KEY,
      pty_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Terminal',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_connected_at TEXT NOT NULL DEFAULT (datetime('now')),
      cols INTEGER DEFAULT 80,
      rows INTEGER DEFAULT 24,
      last_client_id TEXT,
      tmux_session_name TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_pty_sessions_status ON pty_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_pty_sessions_created ON pty_sessions(created_at DESC);

    -- Authentication and Provider Credential Tables

    -- Users table: Local user accounts for authentication
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- Auth sessions table: DB-backed session management
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);

    -- Provider credentials table: Encrypted API keys and OAuth tokens
    CREATE TABLE IF NOT EXISTS provider_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      auth_type TEXT NOT NULL,
      cipher_text BLOB NOT NULL,
      iv BLOB NOT NULL,
      auth_tag BLOB NOT NULL,
      key_version INTEGER NOT NULL DEFAULT 1,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_validated_at TEXT,
      UNIQUE(user_id, provider_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_provider_credentials_user ON provider_credentials(user_id);
    CREATE INDEX IF NOT EXISTS idx_provider_credentials_provider ON provider_credentials(provider_id);

    -- Provider audit log table: Access and modification audit trail
    CREATE TABLE IF NOT EXISTS provider_audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      action TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_audit_user ON provider_audit_log(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_provider ON provider_audit_log(provider_id, created_at DESC);

    -- Add new columns to existing databases (if they don't exist)
    ALTER TABLE pty_sessions ADD COLUMN last_client_id TEXT;
    ALTER TABLE pty_sessions ADD COLUMN tmux_session_name TEXT;
  `);
}

/**
 * Close the database connection
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export default getDb;
