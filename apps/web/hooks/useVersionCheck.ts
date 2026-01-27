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
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export function useVersionCheck(): UseVersionCheckReturn {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [releaseUrl, setReleaseUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkVersion = useCallback(async () => {
    try {
      // Check localStorage for cached result
      const cached = localStorage.getItem(CACHE_KEY);
      let release: GitHubRelease | null = null;

      if (cached) {
        try {
          const cachedData: CachedVersionCheck = JSON.parse(cached);
          const now = Date.now();
          const cacheAge = now - cachedData.timestamp;

          // Use cache if less than 1 hour old
          if (cacheAge < CACHE_DURATION) {
            release = {
              tag_name: cachedData.version,
              html_url: cachedData.url,
              name: '',
            };
          }
        } catch {
          // Invalid cache, will fetch fresh
        }
      }

      // Fetch from GitHub if no valid cache
      if (!release) {
        release = await fetchLatestRelease();

        // Cache the result if successful
        if (release) {
          const cacheData: CachedVersionCheck = {
            version: release.tag_name,
            url: release.html_url,
            timestamp: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        }
      }

      // Update state based on fetched/cached release
      if (release) {
        const isNewer = isNewerVersion(release.tag_name, APP_VERSION);
        setUpdateAvailable(isNewer);
        setLatestVersion(release.tag_name);
        setReleaseUrl(release.html_url);
      } else {
        setUpdateAvailable(false);
        setLatestVersion(null);
        setReleaseUrl(null);
      }
    } catch {
      // Silent failure - no error state
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
