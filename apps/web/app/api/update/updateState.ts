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
 * Check if a process is still running by its PID.
 * Signal 0 to kill() does not send a signal, just checks if process exists.
 */
async function checkProcessRunning(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Force remove the lock file and associated lock files.
 * Used for stale locks or locks from dead processes.
 */
async function forceUnlock(lockPath: string): Promise<void> {
  try {
    // proper-lockfile creates a .lock directory, remove it
    await fs.rm(`${lockPath}.lock`, { recursive: true, force: true });
    console.log(`Successfully forced unlock of ${lockPath}`);
  } catch (error) {
    console.warn('Failed to force unlock:', error);
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
 * Automatically detects and cleans up stale locks before attempting acquisition.
 * Throws an error if lock cannot be acquired after cleanup.
 */
export async function acquireUpdateLock(): Promise<void> {
  const dir = await ensureLockDirectory();
  const lockPath = getLockPath(dir);

  // Check for stale lock first
  const isLocked = await check(lockPath);
  if (isLocked) {
    const metadata = await readMetadata(dir);
    if (metadata) {
      const lockAge = Date.now() - new Date(metadata.timestamp).getTime();
      const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

      if (lockAge > STALE_THRESHOLD) {
        console.log(
          `[Update] Removing stale lock (${lockAge}ms old, threshold: ${STALE_THRESHOLD}ms)`
        );
        await forceUnlock(lockPath);
      } else {
        // Check if process is still running
        const isRunning = await checkProcessRunning(metadata.pid);
        if (!isRunning) {
          console.log(`[Update] Removing lock from dead process (PID ${metadata.pid})`);
          await forceUnlock(lockPath);
        }
      }
    }
  }

  try {
    // Acquire file lock with extended stale timeout
    await lock(lockPath, {
      retries: {
        retries: 2,
        minTimeout: 1000,
      },
      stale: 300000, // 5 minutes - matches our stale detection threshold
      realpath: false,
    });

    // Set legacy flag for backward compatibility
    isUpdating = true;

    // Write metadata for debugging
    await writeMetadata(dir);
  } catch (error) {
    // If still can't acquire after cleanup, attempt one more force-unlock and retry
    console.warn('[Update] Lock acquisition failed, attempting force cleanup and retry...');
    await forceUnlock(lockPath);

    try {
      await lock(lockPath, {
        retries: {
          retries: 0,
        },
        stale: 300000,
        realpath: false,
      });

      isUpdating = true;
      await writeMetadata(dir);
    } catch (retryError) {
      // Check if another process holds the lock
      const metadata = await readMetadata(dir);
      const details = metadata
        ? ` (held by PID ${metadata.pid} on ${metadata.hostname} since ${metadata.timestamp})`
        : '';

      throw new Error(
        `Failed to acquire update lock${details}: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`
      );
    }
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
