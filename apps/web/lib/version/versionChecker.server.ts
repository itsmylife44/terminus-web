import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

export function readFreshVersion(): string {
  try {
    const gitVersion = execSync('git describe --tags --abbrev=0', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    return gitVersion.replace(/^v/, '');
  } catch {
    try {
      const packagePath = resolve(process.cwd(), 'apps/web/package.json');
      const content = JSON.parse(readFileSync(packagePath, 'utf-8'));
      return content.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
