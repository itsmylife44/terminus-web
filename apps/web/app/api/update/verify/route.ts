import { NextResponse } from 'next/server';
import { readFreshVersion } from '@/lib/version/versionChecker.server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VerificationResult {
  success: boolean;
  version: string;
  checks: {
    nextBuild: boolean;
    sharedBuild: boolean;
    pm2Status: boolean;
    gitStatus: boolean;
  };
  errors?: string[];
}

export async function GET() {
  const errors: string[] = [];
  const checks = {
    nextBuild: false,
    sharedBuild: false,
    pm2Status: false,
    gitStatus: false,
  };

  const cwd = process.cwd();
  const repoRoot = cwd.includes('/apps/web') ? cwd.replace('/apps/web', '') : cwd;

  try {
    // Check Next.js build
    try {
      await execAsync('test -d .next && test -f .next/BUILD_ID', { cwd: `${repoRoot}/apps/web` });
      checks.nextBuild = true;
    } catch {
      errors.push('Next.js build artifacts not found');
    }

    // Check shared package build
    try {
      await execAsync('test -d dist', { cwd: `${repoRoot}/packages/shared` });
      checks.sharedBuild = true;
    } catch {
      errors.push('Shared package build artifacts not found');
    }

    // Check PM2 status
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const processes = JSON.parse(stdout);
      const terminusWeb = processes.find((p: any) => p.name === 'terminus-web');
      if (terminusWeb && terminusWeb.pm2_env.status === 'online') {
        checks.pm2Status = true;
      } else {
        errors.push('PM2 process not running or unhealthy');
      }
    } catch {
      errors.push('Failed to check PM2 status');
    }

    // Check git status is clean
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: repoRoot });
      if (stdout.trim() === '') {
        checks.gitStatus = true;
      } else {
        errors.push('Git repository has uncommitted changes');
      }
    } catch {
      errors.push('Failed to check git status');
    }

    const allChecksPass = Object.values(checks).every((check) => check === true);

    const result: VerificationResult = {
      success: allChecksPass,
      version: readFreshVersion(),
      checks,
      ...(errors.length > 0 && { errors }),
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        version: 'unknown',
        checks,
        errors: [error instanceof Error ? error.message : 'Verification failed'],
      },
      { status: 500 }
    );
  }
}
