import type { NextRequest } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { modifyJsoncFile } from '@/lib/config/jsonc-utils';
import { parse } from 'jsonc-parser';

// Whitelist of allowed config files
const ALLOWED_FILES = {
  'opencode.json': {
    path: () => join(homedir(), '.config', 'opencode', 'opencode.json'),
    default: () => ({
      $schema: 'https://opencode.ai/config.json',
      plugin: [],
    }),
  },
  'oh-my-opencode.json': {
    path: () => join(homedir(), '.config', 'opencode', 'oh-my-opencode.json'),
    default: () => ({
      $schema:
        'https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json',
      agents: {},
      categories: {},
    }),
  },
} as const;

type AllowedFile = keyof typeof ALLOWED_FILES;

interface ConfigFile {
  name: string;
  exists: boolean;
  path: string;
}

interface GetListResponse {
  files: ConfigFile[];
}

interface GetFileResponse {
  content: string;
  exists: boolean;
  error?: string;
}

interface PostResponse {
  success: boolean;
  error?: string;
}

function isAllowedFile(filename: unknown): filename is AllowedFile {
  return typeof filename === 'string' && filename in ALLOWED_FILES;
}

async function readConfigFile(
  filename: AllowedFile
): Promise<{ content: string; exists: boolean }> {
  const config = ALLOWED_FILES[filename];
  const filepath = config.path();

  try {
    const fileContent = await readFile(filepath, 'utf-8');
    return { content: fileContent, exists: true };
  } catch {
    // Return default config if file doesn't exist
    const defaultConfig = config.default();
    const defaultContent = JSON.stringify(defaultConfig, null, 2);
    return { content: defaultContent, exists: false };
  }
}

async function writeConfigFile(filename: AllowedFile, content: string): Promise<void> {
  const config = ALLOWED_FILES[filename];
  const filepath = config.path();
  const configDir = dirname(filepath);

  // Ensure directory exists
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }

  // If file doesn't exist, write raw content
  if (!existsSync(filepath)) {
    await writeFile(filepath, content, 'utf-8');
    return;
  }

  // File exists - preserve comments using jsonc-parser
  const newConfig = JSON.parse(content);

  // Apply edits for each top-level key to preserve comments
  for (const [key, value] of Object.entries(newConfig)) {
    modifyJsoncFile(filepath, [key], value, {
      formattingOptions: { tabSize: 2, insertSpaces: true },
    });
  }
}

function validateJsonSyntax(content: string): { valid: boolean; error?: string } {
  try {
    // First try to parse with jsonc-parser
    parse(content);

    // Then validate with native JSON.parse to ensure strict JSON validity
    // (jsonc-parser is too lenient for bare objects)
    JSON.parse(content);

    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON syntax';
    return { valid: false, error: `Invalid JSON syntax: ${message}` };
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const file = searchParams.get('file');

    // If no file parameter, return list of available config files
    if (!file) {
      const files: ConfigFile[] = [];

      for (const filename of Object.keys(ALLOWED_FILES)) {
        const allowedFile = filename as AllowedFile;
        const config = ALLOWED_FILES[allowedFile];
        const filepath = config.path();
        const exists = existsSync(filepath);

        files.push({
          name: filename,
          exists,
          path: filepath,
        });
      }

      const response: GetListResponse = { files };
      return Response.json(response);
    }

    // Validate file parameter
    if (!isAllowedFile(file)) {
      const response: GetFileResponse = {
        content: '',
        exists: false,
        error: `Invalid file name. Allowed files: ${Object.keys(ALLOWED_FILES).join(', ')}`,
      };
      return Response.json(response, { status: 400 });
    }

    // Read the requested file
    const { content, exists } = await readConfigFile(file);

    const response: GetFileResponse = {
      content,
      exists,
    };
    return Response.json(response);
  } catch (error) {
    const response: GetFileResponse = {
      content: '',
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    return Response.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as {
      file?: unknown;
      content?: unknown;
    };

    // Validate request body
    const { file, content } = body;

    if (!file || !content) {
      const response: PostResponse = {
        success: false,
        error: 'Missing required fields: file and content',
      };
      return Response.json(response, { status: 400 });
    }

    // Validate file name
    if (!isAllowedFile(file)) {
      const response: PostResponse = {
        success: false,
        error: `Invalid file name. Allowed files: ${Object.keys(ALLOWED_FILES).join(', ')}`,
      };
      return Response.json(response, { status: 400 });
    }

    // Validate content is a string
    if (typeof content !== 'string') {
      const response: PostResponse = {
        success: false,
        error: 'Content must be a string',
      };
      return Response.json(response, { status: 400 });
    }

    // Validate JSON syntax
    const syntaxValidation = validateJsonSyntax(content);
    if (!syntaxValidation.valid) {
      const response: PostResponse = {
        success: false,
        error: syntaxValidation.error,
      };
      return Response.json(response, { status: 400 });
    }

    // Write the file
    await writeConfigFile(file, content);

    const response: PostResponse = { success: true };
    return Response.json(response);
  } catch (error) {
    const response: PostResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    return Response.json(response, { status: 500 });
  }
}
