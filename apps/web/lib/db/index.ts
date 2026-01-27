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
    CREATE TABLE IF NOT EXISTS pty_sessions (
      id TEXT PRIMARY KEY,
      pty_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Terminal',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_connected_at TEXT NOT NULL DEFAULT (datetime('now')),
      cols INTEGER DEFAULT 80,
      rows INTEGER DEFAULT 24
    );

    CREATE INDEX IF NOT EXISTS idx_pty_sessions_status ON pty_sessions(status);
    CREATE INDEX IF NOT EXISTS idx_pty_sessions_created ON pty_sessions(created_at DESC);
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
