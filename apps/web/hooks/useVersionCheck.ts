'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  APP_VERSION,
  fetchLatestRelease,
  isNewerVersion,
  type GitHubRelease,
} from '@/lib/version/versionChecker';

interface CachedVersionCheck {
  version: string;
  url: string;
  timestamp: number;
}

interface UseVersionCheckReturn {
  updateAvailable: boolean;
  latestVersion: string | null;
  releaseUrl: string | null;
  isLoading: boolean;
}

const CACHE_KEY = 'terminus_version_check';
const CACHE_DURATION = 300000; // 5 minutes

async function fetchRuntimeVersion(): Promise<string> {
  try {
    const response = await fetch('/api/update/status');
    if (response.ok) {
      const data = await response.json();
      if (data.version) {
        return data.version;
      }
    }
  } catch {}
  return APP_VERSION;
}

export function useVersionCheck(): UseVersionCheckReturn {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkVersion = useCallback(async () => {
    try {
      const currentVersion = await fetchRuntimeVersion();

      const cached = localStorage.getItem(CACHE_KEY);
      let release: GitHubRelease | null = null;

      if (cached) {
        try {
          const cachedData: CachedVersionCheck = JSON.parse(cached);
          const now = Date.now();
          const cacheAge = now - cachedData.timestamp;

          if (cacheAge < CACHE_DURATION) {
            release = {
              tag_name: cachedData.version.startsWith('v')
                ? cachedData.version
                : `v${cachedData.version}`,
              html_url: cachedData.url,
              name: '',
            };
          }
        } catch {}
      }

      if (!release) {
        release = await fetchLatestRelease();

        if (release) {
          const cacheData: CachedVersionCheck = {
            version: release.tag_name.replace(/^v/, ''),
            url: release.html_url,
            timestamp: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        }
      }

      if (release) {
        const isNewer = isNewerVersion(release.tag_name, currentVersion);
        setUpdateAvailable(isNewer);
        setLatestVersion(release.tag_name.replace(/^v/, ''));
        setReleaseUrl(release.html_url);
      } else {
        setUpdateAvailable(false);
        setLatestVersion(null);
        setReleaseUrl(null);
      }
    } catch {
      setUpdateAvailable(false);
      setLatestVersion(null);
      setReleaseUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  return {
    updateAvailable,
    latestVersion,
    releaseUrl,
    isLoading,
  };
}
