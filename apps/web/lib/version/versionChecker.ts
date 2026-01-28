import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;
export const GITHUB_REPO = 'itsmylife44/terminus-web';

export interface GitHubRelease {
  tag_name: string;
  html_url: string;
  name: string;
}

export async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as GitHubRelease;
  } catch {
    return null;
  }
}

/**
 * Compare semantic versions properly (not string comparison).
 * Returns true if latest is newer than current.
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const parseVersion = (v: string): number[] =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const latestParts = parseVersion(latest);
  const currentParts = parseVersion(current);

  const maxLength = Math.max(latestParts.length, currentParts.length);
  for (let i = 0; i < maxLength; i++) {
    const latestPart = latestParts[i] || 0;
    const currentPart = currentParts[i] || 0;
    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }
  return false;
}
