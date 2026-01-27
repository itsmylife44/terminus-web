// Read version from package.json - no more hardcoding!
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

export function isNewerVersion(latest: string, current: string): boolean {
  const latestClean = latest.replace(/^v/, '');
  const currentClean = current.replace(/^v/, '');
  return latestClean > currentClean;
}
