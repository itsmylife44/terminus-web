import type { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getUpdateStatus, acquireUpdateLock, releaseUpdateLock } from './updateState';
import { readFreshVersion } from '@/lib/version/versionChecker.server';

const execAsync = promisify(exec);

const UPDATE_STAGE = {
  PREPARING: 'preparing',
  PULLING: 'pulling',
  INSTALLING: 'installing',
  BUILDING: 'building',
  RESTARTING: 'restarting',
  COMPLETE: 'complete',
  ERROR: 'error',
  ROLLING_BACK: 'rolling_back',
} as const;

type UpdateStage = (typeof UPDATE_STAGE)[keyof typeof UPDATE_STAGE];

interface UpdateEvent {
  stage: UpdateStage;
  progress?: number;
  message?: string;
  canRetry?: boolean;
  newVersion?: string;
}

const STAGE_TIMEOUT = 5 * 60 * 1000; // 5 minutes per stage

async function execWithTimeout(
  command: string,
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  return execAsync(command, {
    cwd,
    timeout: STAGE_TIMEOUT,
  });
}

async function getTargetBranch(repoRoot: string): Promise<string> {
  // Check for environment variable override
  const envBranch = process.env.UPDATE_BRANCH;
  if (envBranch) {
    return envBranch;
  }

  // Detect current branch dynamically
  try {
    const { stdout } = await execWithTimeout('git rev-parse --abbrev-ref HEAD', repoRoot);
    const branch = stdout.trim();
    if (branch) {
      return branch;
    }
  } catch {
    // Detection failed, fall through to default
  }

  // Fallback to 'main' if detection fails
  return 'main';
}

export async function POST(request: NextRequest) {
  // Check mutex
  if (await getUpdateStatus()) {
    return new Response(JSON.stringify({ error: 'Update already in progress' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendEvent = async (data: UpdateEvent) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Start async update process
  (async () => {
    try {
      await acquireUpdateLock();
    } catch (error) {
      await sendEvent({
        stage: 'error',
        message: error instanceof Error ? error.message : 'Failed to acquire update lock',
        canRetry: true,
      });
      await writer.close();
      return;
    }

    const cwd = process.cwd();
    const repoRoot = cwd.includes('/apps/web') ? cwd.replace('/apps/web', '') : cwd;
    let originalCommitHash: string | null = null;
    let stashApplied = false;
    let targetBranch: string | null = null;

    try {
      // Stage: Preparing
      await sendEvent({ stage: 'preparing', progress: 0, message: 'Starting update...' });

      // Detect target branch dynamically
      targetBranch = await getTargetBranch(repoRoot);

      // Store current commit hash for potential rollback
      try {
        const { stdout } = await execWithTimeout('git rev-parse HEAD', repoRoot);
        originalCommitHash = stdout.trim();
      } catch {
        throw new Error('Failed to get current commit hash');
      }

      // Stash local changes
      try {
        const { stdout } = await execWithTimeout('git stash', repoRoot);
        stashApplied = !stdout.includes('No local changes');
      } catch {
        stashApplied = false;
      }

      await sendEvent({ stage: 'preparing', progress: 10, message: 'Local changes stashed' });

      await sendEvent({ stage: 'pulling', progress: 20, message: 'Fetching latest changes...' });

      try {
        await execWithTimeout('git fetch --tags origin', repoRoot);
      } catch {
        throw new Error('Failed to fetch tags from origin');
      }

      await sendEvent({ stage: 'pulling', progress: 30, message: 'Pulling latest code...' });

      try {
        await execWithTimeout(`git pull origin ${targetBranch}`, repoRoot);
      } catch {
        throw new Error('Failed to pull latest changes from origin');
      }

      await sendEvent({ stage: 'pulling', progress: 40, message: 'Latest changes pulled' });

      // Stage: Installing
      await sendEvent({ stage: 'installing', progress: 50, message: 'Installing dependencies...' });

      try {
        await execWithTimeout('npm install', repoRoot);
      } catch {
        throw new Error('Failed to install dependencies');
      }

      await sendEvent({ stage: 'installing', progress: 65, message: 'Dependencies installed' });

      // Stage: Building
      await sendEvent({ stage: 'building', progress: 75, message: 'Building application...' });

      try {
        await execWithTimeout('npm run build', repoRoot);
      } catch {
        throw new Error('Failed to build application');
      }

      await sendEvent({ stage: 'building', progress: 85, message: 'Build complete' });

      // Get new version BEFORE restart (reads directly from file, bypassing module cache)
      const newVersion = readFreshVersion();

      // Send complete event BEFORE pm2 restart
      // This ensures frontend receives it before the connection drops
      await sendEvent({
        stage: 'complete',
        progress: 100,
        message: 'Update complete! Restarting services...',
        newVersion,
      });

      // Stage: Restarting (this will kill the current process)
      // Frontend should poll /api/update/status to confirm new process is ready
      try {
        await execWithTimeout('pm2 restart terminus-web', repoRoot);
      } catch {
        // Fallback: restart all processes if terminus-web name fails
        try {
          await execWithTimeout('pm2 restart all', repoRoot);
        } catch {
          // PM2 restart might "fail" from our perspective because the process dies
          // This is expected behavior - the restart is successful
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Stage: Rolling back
      if (originalCommitHash) {
        await sendEvent({ stage: 'rolling_back', message: 'Rolling back to previous version...' });

        try {
          await execWithTimeout(`git checkout ${originalCommitHash}`, repoRoot);

          if (stashApplied) {
            try {
              await execWithTimeout('git stash pop', repoRoot);
            } catch {
              // Stash pop might fail, log but continue
            }
          }

          await sendEvent({ stage: 'rolling_back', message: 'Rollback complete' });
        } catch {
          // Rollback failed
          await sendEvent({
            stage: 'error',
            message: `Rollback failed. Manual intervention required. Original error: ${errorMessage}`,
            canRetry: false,
          });
          return;
        }
      }

      // Stage: Error
      await sendEvent({
        stage: 'error',
        message: errorMessage,
        canRetry: true,
      });
    } finally {
      await releaseUpdateLock();
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
