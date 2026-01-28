import { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getUpdateStatus, setUpdateStatus } from './updateState';

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

export async function POST(request: NextRequest) {
  // Check mutex
  if (getUpdateStatus()) {
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
    setUpdateStatus(true);
    const projectRoot = process.cwd();
    let originalCommitHash: string | null = null;
    let stashApplied = false;

    try {
      // Stage: Preparing
      await sendEvent({ stage: 'preparing', progress: 0, message: 'Starting update...' });

      // Store current commit hash for potential rollback
      try {
        const { stdout } = await execWithTimeout('git rev-parse HEAD', projectRoot);
        originalCommitHash = stdout.trim();
      } catch {
        throw new Error('Failed to get current commit hash');
      }

      // Stash local changes
      try {
        await execWithTimeout('git stash', projectRoot);
        stashApplied = true;
      } catch {
        // Stash might fail if there are no changes, which is fine
        stashApplied = false;
      }

      await sendEvent({ stage: 'preparing', progress: 10, message: 'Local changes stashed' });

      // Stage: Pulling
      await sendEvent({ stage: 'pulling', progress: 25, message: 'Fetching latest changes...' });

      try {
        await execWithTimeout('git pull origin main', projectRoot);
      } catch {
        throw new Error('Failed to pull latest changes from origin');
      }

      await sendEvent({ stage: 'pulling', progress: 40, message: 'Latest changes pulled' });

      // Stage: Installing
      await sendEvent({ stage: 'installing', progress: 50, message: 'Installing dependencies...' });

      try {
        await execWithTimeout('npm install', projectRoot);
      } catch {
        throw new Error('Failed to install dependencies');
      }

      await sendEvent({ stage: 'installing', progress: 65, message: 'Dependencies installed' });

      // Stage: Building
      await sendEvent({ stage: 'building', progress: 75, message: 'Building application...' });

      try {
        await execWithTimeout('npm run build', projectRoot);
      } catch {
        throw new Error('Failed to build application');
      }

      await sendEvent({ stage: 'building', progress: 85, message: 'Build complete' });

      // Stage: Restarting
      await sendEvent({ stage: 'restarting', progress: 90, message: 'Restarting services...' });

      try {
        await execWithTimeout('pm2 restart ecosystem.config.js', projectRoot);
      } catch {
        throw new Error('Failed to restart PM2 services');
      }

      // Get new version after update
      let newVersion = 'unknown';
      try {
        // Re-import to get updated version (dynamic import)
        const versionModule = await import('@/lib/version/versionChecker');
        newVersion = versionModule.APP_VERSION;
      } catch {
        // Version fetch failed, use unknown
      }

      // Stage: Complete
      await sendEvent({
        stage: 'complete',
        progress: 100,
        message: 'Update complete!',
        newVersion,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Stage: Rolling back
      if (originalCommitHash) {
        await sendEvent({ stage: 'rolling_back', message: 'Rolling back to previous version...' });

        try {
          await execWithTimeout(`git checkout ${originalCommitHash}`, projectRoot);

          if (stashApplied) {
            try {
              await execWithTimeout('git stash pop', projectRoot);
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
      setUpdateStatus(false);
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
