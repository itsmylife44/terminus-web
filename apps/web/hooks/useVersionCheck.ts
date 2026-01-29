'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '@/lib/utils/api-request';
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
  checkForUpdates: () => Promise<void>;
}

const CACHE_KEY = 'terminus_version_check';
const CACHE_DURATION = 300000; // 5 minutes

async function fetchRuntimeVersion(): Promise<string> {
  try {
    interface UpdateStatus {
      version?: string;
      [key: string]: unknown;
    }
    const data = await apiRequest<UpdateStatus>('/api/update/status');
    if (data?.version) {
      return data.version;
    }
  } catch {
    // Return default version on error
  }
  return APP_VERSION;
}

export function useVersionCheck(): UseVersionCheckReturn {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkVersion = useCallback(async (skipCache = false) => {
    setIsLoading(true);
    try {
      const currentVersion = await fetchRuntimeVersion();

      let release: GitHubRelease | null = null;

      if (!skipCache) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const cachedData: CachedVersionCheck = JSON.parse(cached);
            const cacheAge = Date.now() - cachedData.timestamp;

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

  const checkForUpdates = useCallback(async () => {
    await checkVersion(true);
  }, [checkVersion]);

  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  return {
    updateAvailable,
    latestVersion,
    releaseUrl,
    isLoading,
    checkForUpdates,
  };
}
