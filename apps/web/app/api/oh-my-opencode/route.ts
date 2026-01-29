import type { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { modifyJsoncFile } from '@/lib/config/jsonc-utils';
import { parse } from 'jsonc-parser';

const execAsync = promisify(exec);

const INSTALL_TIMEOUT = 3 * 60 * 1000; // 3 minutes
const VERSION_TIMEOUT = 10 * 1000; // 10 seconds

function getConfigPath(): string {
  return join(homedir(), '.config', 'opencode', 'opencode.json');
}

function getPluginConfigPath(): string {
  return join(homedir(), '.config', 'opencode', 'oh-my-opencode.json');
}

// In-memory mutex to prevent concurrent operations
let isOperationInProgress = false;

const ACTION = {
  INSTALL: 'install',
  UNINSTALL: 'uninstall',
} as const;

type Action = (typeof ACTION)[keyof typeof ACTION];

interface InstallRequest {
  action: Action;
  claude?: 'no' | 'yes' | 'max20';
  openai?: 'yes' | 'no';
  gemini?: 'yes' | 'no';
  copilot?: 'yes' | 'no';
}

interface StatusResponse {
  installed: boolean;
  version?: string;
  error?: string;
}

interface ActionResponse {
  success: boolean;
  error?: string;
}

async function execWithTimeout(command: string): Promise<{ stdout: string; stderr: string }> {
  return execAsync(command, { timeout: INSTALL_TIMEOUT });
}

async function checkBunInstalled(): Promise<boolean> {
  try {
    await execAsync('which bun');
    return true;
  } catch {
    return false;
  }
}

async function readOpencodeConfig(): Promise<{ content: string; config: Record<string, unknown> }> {
  const configPath = getConfigPath();
  try {
    const content = await readFile(configPath, 'utf-8');
    const config = parse(content) as Record<string, unknown>;
    return { content, config };
  } catch {
    // Return default config if file doesn't exist
    const defaultConfig = { plugin: [] };
    return { content: JSON.stringify(defaultConfig, null, 2), config: defaultConfig };
  }
}

async function writeOpencodeConfig(configPath: string, pluginArray: string[]): Promise<void> {
  const configDir = dirname(configPath);

  // Ensure directory exists
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }

  // Use jsonc-parser to modify while preserving comments
  modifyJsoncFile(configPath, ['plugin'], pluginArray, {
    formattingOptions: { tabSize: 2, insertSpaces: true },
  });
}

async function getInstalledVersion(): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync('bunx oh-my-opencode --version', {
      timeout: VERSION_TIMEOUT,
    });
    // Parse version from output (may contain other text)
    const versionMatch = stdout.match(/\d+\.\d+\.\d+/);
    return versionMatch ? versionMatch[0] : stdout.trim();
  } catch {
    return undefined;
  }
}

function isValidAction(action: unknown): action is Action {
  return action === ACTION.INSTALL || action === ACTION.UNINSTALL;
}

export async function GET(): Promise<Response> {
  try {
    const { config } = await readOpencodeConfig();
    const plugins = (config.plugin as string[]) || [];
    // Check for oh-my-opencode with or without version suffix (e.g., "oh-my-opencode@3.1.5")
    const isInstalled = plugins.some(
      (p) => p === 'oh-my-opencode' || p.startsWith('oh-my-opencode@')
    );

    if (!isInstalled) {
      const response: StatusResponse = { installed: false };
      return Response.json(response);
    }

    const version = await getInstalledVersion();
    const response: StatusResponse = {
      installed: true,
      version: version || 'unknown',
    };
    return Response.json(response);
  } catch (error) {
    const response: StatusResponse = {
      installed: false,
      error: error instanceof Error ? error.message : 'Failed to check installation status',
    };
    return Response.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  // Prevent concurrent operations
  if (isOperationInProgress) {
    const response: ActionResponse = {
      success: false,
      error: 'Operation already in progress',
    };
    return Response.json(response, { status: 429 });
  }

  try {
    const body = (await request.json()) as InstallRequest;

    // Validate action
    if (!body.action || !isValidAction(body.action)) {
      const response: ActionResponse = {
        success: false,
        error: 'Invalid action. Must be "install" or "uninstall"',
      };
      return Response.json(response, { status: 400 });
    }

    // Check if bun is installed
    const bunInstalled = await checkBunInstalled();
    if (!bunInstalled) {
      const response: ActionResponse = {
        success: false,
        error: 'bun is not installed. Please install bun first: https://bun.sh',
      };
      return Response.json(response, { status: 400 });
    }

    isOperationInProgress = true;

    try {
      if (body.action === ACTION.INSTALL) {
        return await handleInstall(body);
      } else {
        return await handleUninstall();
      }
    } finally {
      isOperationInProgress = false;
    }
  } catch (error) {
    isOperationInProgress = false;
    const response: ActionResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    return Response.json(response, { status: 500 });
  }
}

async function handleInstall(body: InstallRequest): Promise<Response> {
  const flags: string[] = ['--no-tui'];

  // Build CLI flags from request body
  if (body.claude) flags.push(`--claude=${body.claude}`);
  if (body.openai) flags.push(`--openai=${body.openai}`);
  if (body.gemini) flags.push(`--gemini=${body.gemini}`);
  if (body.copilot) flags.push(`--copilot=${body.copilot}`);

  const command = `bunx oh-my-opencode install ${flags.join(' ')}`;

  try {
    await execWithTimeout(command);
    const response: ActionResponse = { success: true };
    return Response.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Installation failed';
    const response: ActionResponse = {
      success: false,
      error: `Installation failed: ${errorMessage}`,
    };
    return Response.json(response, { status: 500 });
  }
}

async function handleUninstall(): Promise<Response> {
  try {
    const { config } = await readOpencodeConfig();

    // Get current plugins array
    const currentPlugins = (config.plugin as string[]) || [];

    const newPlugins = currentPlugins.filter(
      (p: string) => p !== 'oh-my-opencode' && !p.startsWith('oh-my-opencode@')
    );

    // Write updated config (preserving comments and formatting)
    await writeOpencodeConfig(getConfigPath(), newPlugins);

    // Delete plugin config file if it exists
    const pluginConfigPath = getPluginConfigPath();
    try {
      await unlink(pluginConfigPath);
    } catch {
      // File may not exist, that's okay
    }

    const response: ActionResponse = { success: true };
    return Response.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Uninstall failed';
    const response: ActionResponse = {
      success: false,
      error: `Uninstall failed: ${errorMessage}`,
    };
    return Response.json(response, { status: 500 });
  }
}
