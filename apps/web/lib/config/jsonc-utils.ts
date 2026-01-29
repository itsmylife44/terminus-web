/**
 * JSONC Configuration File Utilities
 *
 * Utilities for reading/writing JSONC (JSON with Comments) files
 * while preserving comments and formatting.
 */

import { readFileSync, writeFileSync } from 'fs';
import { parse, modify, applyEdits, type ModificationOptions } from 'jsonc-parser';

export interface JsoncReadOptions {
  /**
   * Default value to return if file doesn't exist or parse fails
   */
  defaultValue?: unknown;

  /**
   * Whether to throw on parse errors (default: true)
   */
  throwOnError?: boolean;
}

/**
 * Read and parse a JSONC file
 */
export function readJsoncFile<T = unknown>(filePath: string, options: JsoncReadOptions = {}): T {
  const { defaultValue, throwOnError = true } = options;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = parse(content);
    return parsed as T;
  } catch (error) {
    if (throwOnError) {
      throw new Error(
        `Failed to read JSONC file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    return (defaultValue ?? {}) as T;
  }
}

/**
 * Write object to JSONC file (overwrites, does not preserve comments)
 */
export function writeJsoncFile(filePath: string, data: unknown): void {
  try {
    const content = JSON.stringify(data, null, 2);
    writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to write JSONC file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Modify JSONC file preserving comments and formatting
 */
export function modifyJsoncFile(
  filePath: string,
  path: string[],
  value: unknown,
  options?: ModificationOptions
): void {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const edits = modify(content, path, value, options || {});
    const modified = applyEdits(content, edits);
    writeFileSync(filePath, modified, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to modify JSONC file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
