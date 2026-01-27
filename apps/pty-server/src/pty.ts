import { spawn } from 'node-pty';
import type { IPty } from 'node-pty';
import type { PtySpawnOptions } from './types.js';

// Environment variable whitelist for security
const ALLOWED_ENV_VARS = [
  'TERM',
  'COLORTERM',
  'LANG',
  'PATH',
  'HOME',
  'USER',
];

/**
 * Create a safe environment for PTY by whitelisting specific variables
 */
function createSafeEnvironment(): Record<string, string> {
  const safeEnv: Record<string, string> = {};

  for (const envVar of ALLOWED_ENV_VARS) {
    const value = process.env[envVar];
    if (value !== undefined) {
      safeEnv[envVar] = value;
    }
  }

  // Set TERM to xterm-256color for full color support
  safeEnv.TERM = 'xterm-256color';

  return safeEnv;
}

/**
 * Spawn a shell process with PTY
 * @param options PTY spawn options
 * @returns IPty instance
 */
export function spawnPty(options: PtySpawnOptions = {}): IPty {
  const shell = process.env.OPENCODE_PATH || options.shell || process.env.SHELL || '/bin/bash';
  const safeEnv = createSafeEnvironment();

  const pty = spawn(shell, [], {
    name: 'xterm-256color',
    cols: options.cols || 80,
    rows: options.rows || 24,
    cwd: options.cwd || process.env.HOME,
    env: safeEnv,
  });

  return pty;
}

/**
 * Get the list of whitelisted environment variables
 */
export function getAllowedEnvVars(): string[] {
  return [...ALLOWED_ENV_VARS];
}
