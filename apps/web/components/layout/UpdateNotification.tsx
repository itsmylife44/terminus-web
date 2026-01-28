'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUpCircle, Download, Loader2, Check } from 'lucide-react';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
  toggleAutoUpdate,
  showConfirmDialog,
  hideConfirmDialog,
  setUpdateAvailable,
} from '@/lib/store/updateSlice';
import { APP_VERSION } from '@/lib/version/versionChecker';
import { Switch } from '@/components/ui/switch';
import { UpdateConfirmDialog } from '@/components/layout/UpdateConfirmDialog';
import { useAutoUpdate } from '@/hooks/useAutoUpdate';

const STAGE_LABELS = {
  preparing: 'Preparing update...',
  pulling: 'Downloading update...',
  installing: 'Installing dependencies...',
  building: 'Building application...',
  restarting: 'Restarting server...',
  complete: 'Update complete!',
  error: 'Update failed',
  rolling_back: 'Rolling back changes...',
};

export function UpdateNotification() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [runtimeVersion, setRuntimeVersion] = useState<string | null>(null);

  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectionSuccess, setReconnectionSuccess] = useState(false);
  const [reconnectionError, setReconnectionError] = useState<string | null>(null);

  // Redux state
  const dispatch = useAppDispatch();
  const {
    autoUpdateEnabled,
    showConfirmDialog: dialogOpen,
    isAutoUpdateTrigger,
    isUpdating,
    updateStage,
    updateProgress,
    updateError,
    currentVersion,
    latestVersion: reduxLatestVersion,
    releaseUrl: reduxReleaseUrl,
    updateAvailable: reduxUpdateAvailable,
  } = useAppSelector((state) => state.update);

  // Version check (existing)
  const { updateAvailable, latestVersion, releaseUrl, isLoading } = useVersionCheck();

  const { triggerUpdate } = useAutoUpdate();

  useEffect(() => {
    const fetchRuntimeVersion = async () => {
      try {
        const response = await fetch('/api/update/status');
        if (response.ok) {
          const data = await response.json();
          if (data.version) {
            setRuntimeVersion(data.version);
          }
        }
      } catch {}
    };
    fetchRuntimeVersion();
  }, []);
  useEffect(() => {
    if (updateAvailable && latestVersion && releaseUrl) {
      dispatch(setUpdateAvailable({ latestVersion, releaseUrl }));
    }
  }, [updateAvailable, latestVersion, releaseUrl, dispatch]);

  // Reconnection polling after server restart
  useEffect(() => {
    if (updateStage !== 'restarting') {
      return;
    }

    setIsReconnecting(true);
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes with exponential backoff
    let timeoutId: NodeJS.Timeout;

    const getDelay = (attempt: number) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      return Math.min(1000 * Math.pow(2, attempt), 30000);
    };

    const pollServer = async () => {
      try {
        const response = await fetch('/api/update/status');
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'ready') {
            setIsReconnecting(false);
            setReconnectionSuccess(true);
            // Clear cache and refresh version
            localStorage.removeItem('terminus_version_check');
            // Auto-dismiss success after 5 seconds
            setTimeout(() => setReconnectionSuccess(false), 5000);
            return;
          }
        }
      } catch {
        // Server not ready yet, continue polling
      }

      attempts++;
      if (attempts >= maxAttempts) {
        setIsReconnecting(false);
        setReconnectionError('Server may still be starting. Refresh to retry.');
        return;
      }

      timeoutId = setTimeout(pollServer, getDelay(attempts));
    };

    // Start polling after a short delay (server needs time to restart)
    timeoutId = setTimeout(pollServer, 2000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [updateStage]);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleUpdateClick = () => {
    dispatch(showConfirmDialog(false));
  };

  const handleConfirmUpdate = () => {
    triggerUpdate();
  };

  const handleCancelUpdate = () => {
    dispatch(hideConfirmDialog());
  };

  const handleToggleAutoUpdate = () => {
    dispatch(toggleAutoUpdate());
  };

  const displayVersion = runtimeVersion || currentVersion || APP_VERSION;
  const hasUpdate = reduxUpdateAvailable || updateAvailable;
  const displayLatestVersion = reduxLatestVersion || latestVersion;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white transition-all duration-200 rounded-md hover:bg-gray-800/50"
        >
          <span className="font-mono tracking-tight">v{displayVersion}</span>
          {hasUpdate && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div
            className="absolute top-full right-0 mt-2 w-72 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl z-50 overflow-hidden"
            style={{
              animation: 'slideDown 0.2s ease-out',
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-800 bg-gradient-to-br from-gray-900 to-gray-900/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Version Info</h3>
                {isUpdating && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-3 space-y-3">
              {/* Version Comparison */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Current</span>
                  <span className="font-mono text-white font-medium">v{displayVersion}</span>
                </div>
                {hasUpdate && displayLatestVersion && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Latest</span>
                    <span className="font-mono text-blue-400 font-medium flex items-center gap-1.5">
                      v{displayLatestVersion}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        NEW
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Update Button */}
              {hasUpdate && !isUpdating && (
                <button
                  type="button"
                  onClick={handleUpdateClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-md font-medium text-sm transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                >
                  <Download className="w-4 h-4" />
                  Update Now
                </button>
              )}

              {/* Progress Bar (when updating) */}
              {isUpdating && updateStage && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      {STAGE_LABELS[updateStage] || 'Updating...'}
                    </span>
                    <span className="text-gray-500 font-mono">{updateProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300 ease-out"
                      style={{ width: `${updateProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Reconnecting State */}
              {isReconnecting && (
                <div className="flex items-center gap-2 text-sm text-yellow-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reconnecting to server...</span>
                </div>
              )}

              {/* Success Message */}
              {reconnectionSuccess && (
                <div className="px-3 py-2 bg-green-900/20 border border-green-900/50 rounded-md">
                  <p className="text-xs text-green-300 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Update complete! Now running v{displayLatestVersion}
                  </p>
                </div>
              )}

              {/* Reconnection Error */}
              {reconnectionError && (
                <div className="px-3 py-2 bg-yellow-900/20 border border-yellow-900/50 rounded-md">
                  <p className="text-xs text-yellow-300">{reconnectionError}</p>
                </div>
              )}

              {/* Error Message */}
              {updateError && (
                <div className="px-3 py-2 bg-red-900/20 border border-red-900/50 rounded-md">
                  <p className="text-xs text-red-300">{updateError}</p>
                </div>
              )}

              {/* Auto-update Toggle */}
              <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">Auto-update</span>
                    <span className="text-xs text-gray-500">
                      Update automatically when available
                    </span>
                  </div>
                  <Switch checked={autoUpdateEnabled} onCheckedChange={handleToggleAutoUpdate} />
                </div>
              </div>

              {/* Release Link */}
              {hasUpdate && (reduxReleaseUrl || releaseUrl) && (
                <a
                  href={reduxReleaseUrl || releaseUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs text-blue-400 hover:text-blue-300 transition-colors pt-1"
                >
                  View release notes →
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <UpdateConfirmDialog
        isOpen={dialogOpen}
        onConfirm={handleConfirmUpdate}
        onCancel={handleCancelUpdate}
        currentVersion={displayVersion}
        newVersion={displayLatestVersion || ''}
        isAutoUpdate={isAutoUpdateTrigger}
      />

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
