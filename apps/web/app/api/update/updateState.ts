// File-based mutex for cross-process update synchronization
// Uses proper-lockfile for reliable file locking with stale lock detection

import { lock, unlock, check } from 'proper-lockfile';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Backward compatibility: keep in-memory flag during transition
let isUpdating = false;

// Lock file configuration
const LOCK_FILENAME = '.update-lock';
const METADATA_FILENAME = '.update-metadata.json';

interface UpdateMetadata {
  pid: number;
  timestamp: string;
  hostname: string;
}

// Try multiple directories for lock file (permission fallback)
const LOCK_DIRECTORIES = [path.join(os.tmpdir(), 'terminus-web'), path.join(process.cwd(), '.tmp')];

let lockDirectory: string | null = null;

// Initialize lock directory (find writable location)
async function ensureLockDirectory(): Promise<string> {
  if (lockDirectory) {
    return lockDirectory;
  }

  for (const dir of LOCK_DIRECTORIES) {
    try {
      await fs.mkdir(dir, { recursive: true });
      // Test write permission
      const testFile = path.join(dir, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      lockDirectory = dir;
      return dir;
    } catch (error) {
      // Try next directory
      continue;
    }
  }

  throw new Error('No writable directory found for lock files');
}

function getLockPath(dir: string): string {
  return path.join(dir, LOCK_FILENAME);
}

function getMetadataPath(dir: string): string {
  return path.join(dir, METADATA_FILENAME);
}

async function writeMetadata(dir: string): Promise<void> {
  const metadata: UpdateMetadata = {
    pid: process.pid,
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
  };

  try {
    await fs.writeFile(getMetadataPath(dir), JSON.stringify(metadata, null, 2), 'utf-8');
  } catch (error) {
    // Non-fatal: metadata is informational only
    console.warn('Failed to write lock metadata:', error);
  }
}

async function readMetadata(dir: string): Promise<UpdateMetadata | null> {
  try {
    const content = await fs.readFile(getMetadataPath(dir), 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

async function cleanupMetadata(dir: string): Promise<void> {
  try {
    await fs.unlink(getMetadataPath(dir));
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Check if an update is currently in progress.
 * Returns true if either the legacy in-memory flag is set OR a file lock exists.
 * This provides backward compatibility during transition period.
 */
export async function getUpdateStatus(): Promise<boolean> {
  // Check legacy in-memory flag first
  if (isUpdating) {
    return true;
  }

  try {
    const dir = await ensureLockDirectory();
    const lockPath = getLockPath(dir);

    // Check if lock file exists and is locked
    return await check(lockPath);
  } catch (error) {
    // If we can't check the lock, assume no update is running
    console.warn('Failed to check update lock status:', error);
    return false;
  }
}

/**
 * Acquire the update lock.
 * Throws an error if lock cannot be acquired (another process holds it).
 * Writes metadata file with PID and timestamp for debugging.
 */
export async function acquireUpdateLock(): Promise<void> {
  const dir = await ensureLockDirectory();
  const lockPath = getLockPath(dir);

  try {
    // Acquire file lock with stale lock detection
    await lock(lockPath, {
      retries: {
        retries: 0, // Don't retry, fail fast
      },
      stale: 30000, // Consider lock stale after 30 seconds
      realpath: false, // Don't resolve symlinks (performance)
    });

    // Set legacy flag for backward compatibility
    isUpdating = true;

    // Write metadata for debugging
    await writeMetadata(dir);
  } catch (error) {
    // Check if another process holds the lock
    const metadata = await readMetadata(dir);
    const details = metadata
      ? ` (held by PID ${metadata.pid} on ${metadata.hostname} since ${metadata.timestamp})`
      : '';

    throw new Error(
      `Failed to acquire update lock${details}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Release the update lock.
 * Should be called when update process completes or fails.
 * Cleans up metadata file.
 */
export async function releaseUpdateLock(): Promise<void> {
  const dir = await ensureLockDirectory();
  const lockPath = getLockPath(dir);

  try {
    // Release file lock
    await unlock(lockPath);

    // Clear legacy flag
    isUpdating = false;

    // Cleanup metadata
    await cleanupMetadata(dir);
  } catch (error) {
    console.warn('Failed to release update lock:', error);
    // Still clear the legacy flag even if file unlock fails
    isUpdating = false;
  }
}

/**
 * Legacy function for backward compatibility.
 * New code should use acquireUpdateLock() / releaseUpdateLock().
 */
export function setUpdateStatus(status: boolean): void {
  isUpdating = status;
  console.warn(
    'setUpdateStatus() is deprecated. Use acquireUpdateLock() / releaseUpdateLock() instead.'
  );
}
