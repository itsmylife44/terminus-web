/**
 * Self-Healing Update System
 *
 * Automatically recovers from:
 * - Git conflicts/divergence → Resets to origin/branch
 * - Missing dependencies → Auto-installs required packages
 * - Build failures → 3 retry attempts with different recovery strategies
 *
 * Recovery strategies:
 * 1. Git: Pre-check for divergence, auto-reset on conflict
 * 2. Deps: Clean install, legacy peer deps, ensure critical packages
 * 3. Build: Clean caches, install missing modules, clear npm cache
 */
import type { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getUpdateStatus, acquireUpdateLock, releaseUpdateLock } from './updateState';
import { readFreshVersion } from '@/lib/version/versionChecker.server';
import { getRecentlyActiveSessions } from '@/lib/db/pty-sessions';
import { broadcastUpdateEvent } from '../auto-update/progress/route';

const execAsync = promisify(exec);

const UPDATE_STAGE = {
  PREPARING: 'preparing',
  PULLING: 'pulling',
  INSTALLING: 'installing',
  BUILDING: 'building',
  VERIFYING: 'verifying',
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

// Helper: Detect and fix git issues before pulling
async function detectAndFixGitIssues(repoRoot: string, targetBranch: string): Promise<void> {
  try {
    // Check git status for divergence/conflicts
    const { stdout: status } = await execWithTimeout('git status -uno', repoRoot);

    if (status.includes('have diverged') || status.includes('Your branch is ahead')) {
      // Reset to origin to resolve divergence
      await execWithTimeout('git fetch origin', repoRoot);
      await execWithTimeout(`git reset --hard origin/${targetBranch}`, repoRoot);
      return;
    }

    // Check for uncommitted changes that might cause conflicts
    const { stdout: diffStatus } = await execWithTimeout('git diff --stat', repoRoot);
    if (diffStatus.trim()) {
      // Stash or discard changes
      await execWithTimeout('git reset --hard HEAD', repoRoot);
    }
  } catch {
    // If status check fails, do hard reset as safety measure
    try {
      await execWithTimeout('git fetch origin', repoRoot);
      await execWithTimeout(`git reset --hard origin/${targetBranch}`, repoRoot);
    } catch {
      // Even fetch might fail, try to continue
    }
  }
}

// Helper: Ensure critical dependencies are installed
async function ensureDependencies(repoRoot: string): Promise<void> {
  const requiredDeps = [
    { name: 'typescript', dev: true },
    { name: 'turbo', dev: true },
    { name: 'tailwindcss-animate', dev: false },
    { name: '@tailwindcss/postcss', dev: true },
  ];

  const missingDeps = [];

  // Collect all missing deps first
  for (const dep of requiredDeps) {
    try {
      // Check if dependency exists in package.json
      const { stdout } = await execWithTimeout(`npm list ${dep.name} --depth=0`, repoRoot);
      if (stdout.includes('(empty)') || stdout.includes('UNMET')) {
        throw new Error('Dependency missing');
      }
    } catch {
      missingDeps.push({ name: dep.name, dev: dep.dev });
    }
  }

  if (missingDeps.length === 0) {
    return; // All deps present
  }

  // Install all missing deps in one batch
  const devDeps = missingDeps.filter((d) => d.dev).map((d) => d.name);
  const prodDeps = missingDeps.filter((d) => !d.dev).map((d) => d.name);

  try {
    // Install dev deps
    if (devDeps.length > 0) {
      await execWithTimeout(`npm install ${devDeps.join(' ')} --save-dev`, repoRoot);
    }
    // Install prod deps
    if (prodDeps.length > 0) {
      await execWithTimeout(`npm install ${prodDeps.join(' ')} --save`, repoRoot);
    }
  } catch (error) {
    // Fallback: install one by one
    for (const dep of missingDeps) {
      try {
        const flag = dep.dev ? '--save-dev' : '--save';
        await execWithTimeout(`npm install ${dep.name} ${flag}`, repoRoot);
      } catch {
        // Continue even if individual install fails
      }
    }
  }

  // Ensure TypeScript is available in workspaces - critical for build
  const workspacesNeedingTypeScript = [`${repoRoot}/packages/shared`, `${repoRoot}/apps/web`];

  for (const workspace of workspacesNeedingTypeScript) {
    try {
      await execWithTimeout('npx tsc --version', workspace);
    } catch {
      try {
        await execWithTimeout('npm install typescript --save-dev', workspace);
      } catch {
        // Continue even if install fails
      }
    }
  }
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
  const activeSessions = getRecentlyActiveSessions(5);
  if (activeSessions.length > 0) {
    return new Response(
      JSON.stringify({
        error: `Cannot update: ${activeSessions.length} active terminal sessions. Please close all terminals first.`,
      }),
      {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

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
    console.log('[Update API] Sending event:', data);

    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

    broadcastUpdateEvent(data);
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

      // Pre-check and fix git issues before attempting pull
      await detectAndFixGitIssues(repoRoot, targetBranch);

      await sendEvent({ stage: 'pulling', progress: 20, message: 'Fetching latest changes...' });

      try {
        await execWithTimeout('git fetch --tags origin', repoRoot);
      } catch {
        throw new Error('Failed to fetch tags from origin');
      }

      await sendEvent({ stage: 'pulling', progress: 30, message: 'Pulling latest code...' });

      // Stage: Pulling - with automatic conflict resolution
      try {
        await execWithTimeout(`git pull origin ${targetBranch}`, repoRoot);
      } catch (pullError) {
        // Auto-fix git conflicts
        await sendEvent({ stage: 'pulling', progress: 35, message: 'Resolving git conflicts...' });

        try {
          // Option 1: Reset to origin if diverged
          await execWithTimeout('git fetch origin', repoRoot);
          await execWithTimeout(`git reset --hard origin/${targetBranch}`, repoRoot);
          await sendEvent({
            stage: 'pulling',
            progress: 40,
            message: `Reset to origin/${targetBranch}`,
          });
        } catch {
          // Option 2: Force checkout
          try {
            await execWithTimeout(`git checkout -f ${targetBranch}`, repoRoot);
            await execWithTimeout(`git reset --hard origin/${targetBranch}`, repoRoot);
          } catch {
            throw new Error('Failed to resolve git conflicts');
          }
        }
      }

      await sendEvent({ stage: 'pulling', progress: 40, message: 'Latest changes pulled' });

      // Stage: Installing - with dependency resolution
      await sendEvent({ stage: 'installing', progress: 45, message: 'Installing dependencies...' });

      // Backup package-lock.json before npm install for rollback
      try {
        await execWithTimeout('cp package-lock.json /tmp/package-lock.json.backup', repoRoot);
      } catch {
        // Backup might fail, continue anyway
      }

      try {
        await execWithTimeout('npm install --workspaces --include-workspace-root', repoRoot);
      } catch (installError) {
        await sendEvent({ stage: 'installing', progress: 55, message: 'Fixing dependencies...' });

        // Clean install attempt with workspaces
        try {
          await execWithTimeout('rm -rf node_modules package-lock.json', repoRoot);
          await execWithTimeout('rm -rf packages/*/node_modules apps/*/node_modules', repoRoot);
          await execWithTimeout('npm ci --workspaces --include-workspace-root', repoRoot);
        } catch {
          // Fallback: regular install with legacy peer deps
          try {
            await execWithTimeout(
              'npm install --workspaces --include-workspace-root --legacy-peer-deps',
              repoRoot
            );
          } catch {
            throw new Error('Failed to install dependencies after multiple attempts');
          }
        }

        // Ensure critical build dependencies
        await ensureDependencies(repoRoot);
      }

      await sendEvent({ stage: 'installing', progress: 65, message: 'Dependencies installed' });

      // Ensure critical build dependencies before attempting build
      await ensureDependencies(repoRoot);

      // Stage: Building - with error recovery and retries
      await sendEvent({ stage: 'building', progress: 75, message: 'Building application...' });

      let buildAttempts = 0;
      const maxBuildAttempts = 3;
      let lastBuildError: any = null;

      while (buildAttempts < maxBuildAttempts) {
        try {
          await execWithTimeout('npm run build', repoRoot);
          break; // Build successful
        } catch (buildError: any) {
          buildAttempts++;
          lastBuildError = buildError;

          await sendEvent({
            stage: 'building',
            progress: 75 + buildAttempts * 5,
            message: `Build attempt ${buildAttempts}/${maxBuildAttempts}...`,
          });

          if (buildAttempts === 1) {
            // First retry: Clean .next and turbo cache
            try {
              await execWithTimeout('rm -rf apps/web/.next', repoRoot);
              await execWithTimeout('rm -rf .turbo', repoRoot);
              await execWithTimeout('rm -rf node_modules/.cache', repoRoot);
            } catch {
              // Continue even if cleanup fails
            }
          } else if (buildAttempts === 2) {
            // Second retry: Install missing deps based on error
            const errorStr = buildError.stderr || buildError.message || '';

            // Check for exit code 127 (command not found - missing build tools)
            if (errorStr.includes('exited (127)') || errorStr.includes('command not found')) {
              await sendEvent({
                stage: 'building',
                progress: 85,
                message: 'Installing missing build tools...',
              });

              try {
                // Install TypeScript in root
                await execWithTimeout('npm install typescript turbo --save-dev', repoRoot);

                // Also ensure TypeScript is available in the shared package
                await execWithTimeout(
                  'npm install typescript --save-dev',
                  `${repoRoot}/packages/shared`
                );

                // Reinstall all dependencies to ensure proper linking
                await execWithTimeout('npm install', repoRoot);
              } catch {
                // Continue to other recovery attempts
              }
            }

            if (errorStr.includes('turbo')) {
              try {
                await execWithTimeout('npm install turbo --save-dev', repoRoot);
              } catch {}
            }
            if (errorStr.includes('tailwindcss-animate')) {
              try {
                await execWithTimeout('npm install tailwindcss-animate', repoRoot);
              } catch {}
            }
            if (errorStr.includes('@tailwindcss/postcss')) {
              try {
                await execWithTimeout('npm install @tailwindcss/postcss --save-dev', repoRoot);
              } catch {}
            }
            if (errorStr.includes('Cannot find module')) {
              // Generic module missing - try reinstalling all deps
              try {
                await execWithTimeout('npm ci', repoRoot);
              } catch {
                await execWithTimeout('npm install', repoRoot);
              }
            }

            // Clear npm cache as last resort
            try {
              await execWithTimeout('npm cache clean --force', repoRoot);
            } catch {}
          }
        }
      }

      if (buildAttempts >= maxBuildAttempts) {
        throw new Error(
          `Build failed after ${maxBuildAttempts} attempts: ${lastBuildError?.message || 'Unknown error'}`
        );
      }

      await sendEvent({ stage: 'building', progress: 85, message: 'Build complete' });

      // Verify build outputs exist before proceeding
      await sendEvent({
        stage: 'verifying',
        progress: 88,
        message: 'Verifying build artifacts...',
      });

      try {
        // Check if Next.js build output exists
        await execWithTimeout('test -d apps/web/.next', repoRoot);
        await execWithTimeout('test -f apps/web/.next/BUILD_ID', repoRoot);

        // Check if shared package built successfully
        await execWithTimeout('test -d packages/shared/dist', repoRoot);

        // Quick health check on the build
        const { stdout: buildId } = await execWithTimeout('cat apps/web/.next/BUILD_ID', repoRoot);
        if (!buildId || buildId.trim().length === 0) {
          throw new Error('Build verification failed: BUILD_ID is empty');
        }

        await sendEvent({ stage: 'verifying', progress: 90, message: 'Build artifacts verified' });
      } catch (verifyError) {
        // Build artifacts missing or invalid - attempt rebuild
        await sendEvent({
          stage: 'verifying',
          progress: 89,
          message: 'Build verification failed, attempting recovery...',
        });

        try {
          await execWithTimeout('npm run build', repoRoot);
          // Re-verify after rebuild
          await execWithTimeout('test -d apps/web/.next', repoRoot);
          await execWithTimeout('test -f apps/web/.next/BUILD_ID', repoRoot);
        } catch {
          throw new Error('Build verification failed: Required artifacts not found after rebuild');
        }
      }

      // Get new version BEFORE restart (reads directly from file, bypassing module cache)
      const newVersion = readFreshVersion();

      // Stage: Restarting
      await sendEvent({
        stage: 'restarting',
        progress: 95,
        message: 'Restarting services...',
      });

      // Store update success flag before restart
      try {
        await execWithTimeout(`echo '${newVersion}' > /tmp/terminus-update-success.txt`, repoRoot);
      } catch {
        // Continue even if flag file creation fails
      }

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

      // Send complete event (may not reach frontend if process dies)
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
          // 1. Git reset to original commit
          await execWithTimeout(`git reset --hard ${originalCommitHash}`, repoRoot);

          // 2. Restore package-lock.json from backup
          try {
            await execWithTimeout('cp /tmp/package-lock.json.backup package-lock.json', repoRoot);
          } catch {
            // Backup might not exist, continue
          }

          // 3. Reinstall dependencies to match original lockfile
          try {
            await execWithTimeout('npm ci', repoRoot);
          } catch {
            // npm ci might fail, try npm install as fallback
            await execWithTimeout('npm install', repoRoot);
          }

          // 4. Rebuild with original code and dependencies
          try {
            await execWithTimeout('npm run build', repoRoot);
          } catch {
            // Build might fail during rollback
          }

          // 5. Restore stashed changes
          if (stashApplied) {
            try {
              await execWithTimeout('git stash pop', repoRoot);
            } catch {
              // Stash pop might fail due to conflicts
            }
          }

          // 6. Log rollback completion
          try {
            const logMessage = `[${new Date().toISOString()}] Rollback completed to ${originalCommitHash}\n`;
            await execWithTimeout(`echo '${logMessage}' >> /tmp/terminus-update.log`, repoRoot);
          } catch {
            // Logging failure doesn't block rollback
          }

          await sendEvent({ stage: 'rolling_back', message: 'Rollback complete' });
        } catch {
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
