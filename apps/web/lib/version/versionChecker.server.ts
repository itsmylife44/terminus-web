import { readFileSync } from 'fs';
import { resolve } from 'path';

export function readFreshVersion(): string {
  try {
    const packagePath = resolve(process.cwd(), 'apps/web/package.json');
    const content = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return content.version || 'unknown';
  } catch {
    return 'unknown';
  }
}
