'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Loader2, Check } from 'lucide-react';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import {
  toggleAutoUpdate,
  showConfirmDialog,
  hideConfirmDialog,
  dismissUpdateNotification,
  setUpdateAvailable,
} from '@/lib/store/updateSlice';
import { APP_VERSION } from '@/lib/version/versionChecker';
import { Switch } from '@/components/ui/switch';
import { UpdateConfirmDialog } from '@/components/layout/UpdateConfirmDialog';
import { UpdateProgressModal } from '@/components/layout/UpdateProgressModal';
import { useAutoUpdate } from '@/hooks/useAutoUpdate';
import { Portal } from '@/components/ui/portal';

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

interface DropdownPosition {
  top: number;
  left: number;
}

export function UpdateNotification() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
  const [runtimeVersion, setRuntimeVersion] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

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
  const { updateAvailable, latestVersion, releaseUrl } = useVersionCheck();

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

  useEffect(() => {
    if (isUpdating && !showProgressModal) {
      console.log('[UpdateNotification] Update started, showing progress modal');
      setShowProgressModal(true);
    }
  }, [isUpdating, showProgressModal]);

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
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
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
    dispatch(showConfirmDialog(true));
  };

  const handleConfirmUpdate = () => {
    console.log('[UpdateNotification] User confirmed update, showing progress modal');
    dispatch(hideConfirmDialog());
    setShowProgressModal(true);
    triggerUpdate();
  };

  const handleCancelUpdate = () => {
    if (displayLatestVersion) {
      dispatch(dismissUpdateNotification(displayLatestVersion));
    } else {
      dispatch(hideConfirmDialog());
    }
  };

  const handleRetryUpdate = () => {
    console.log('[UpdateNotification] Retrying update');
    setShowProgressModal(true);
    triggerUpdate();
  };

  const handleToggleAutoUpdate = () => {
    dispatch(toggleAutoUpdate());
  };

  const displayVersion = runtimeVersion || currentVersion || APP_VERSION;
  const hasUpdate = reduxUpdateAvailable || updateAvailable;
  const displayLatestVersion = reduxLatestVersion || latestVersion;

  const calculateDropdownPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 8,
      left: rect.right,
    });
  };

  const handleOpenDropdown = () => {
    setIsOpen(true);
    calculateDropdownPosition();
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpenDropdown}
        className="group relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground-muted hover:text-foreground transition-all duration-200 rounded-md hover:bg-white/5"
      >
        <span className="font-mono tracking-tight">v{displayVersion}</span>
        {hasUpdate && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
        )}
      </button>

      {/* Dropdown Panel - Portal */}
      {isOpen && (
        <Portal>
          <div
            className="fixed w-72 bg-background-elevated/80 backdrop-blur-xl border border-white/6 rounded-lg shadow-2xl z-50 overflow-hidden"
            style={{
              animation: 'slideDown 0.2s ease-out',
              top: `${dropdownPosition.top}px`,
              right: `${typeof window !== 'undefined' ? window.innerWidth - dropdownPosition.left : 0}px`,
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/6 bg-gradient-to-br from-background-elevated to-background-elevated/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Version Info</h3>
                {isUpdating && <Loader2 className="w-4 h-4 text-accent animate-spin" />}
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-3 space-y-3">
              {/* Version Comparison */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground-muted">Current</span>
                  <span className="font-mono text-foreground font-medium">v{displayVersion}</span>
                </div>
                {hasUpdate && displayLatestVersion && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground-muted">Latest</span>
                    <span className="font-mono text-accent font-medium flex items-center gap-1.5">
                      v{displayLatestVersion}
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-accent/20 text-accent border border-accent/30">
                        NEW
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Update Button */}
              {hasUpdate && !isUpdating && !showProgressModal && (
                <button
                  type="button"
                  onClick={handleUpdateClick}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent to-accent hover:opacity-90 text-white rounded-md font-medium text-sm transition-all duration-200 shadow-lg shadow-accent/20 hover:shadow-accent/40"
                >
                  <Download className="w-4 h-4" />
                  Update Now
                </button>
              )}

              {/* Progress Bar (when updating) */}
              {isUpdating && updateStage && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground-muted">
                      {STAGE_LABELS[updateStage] || 'Updating...'}
                    </span>
                    <span className="text-foreground-muted font-mono">{updateProgress}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-accent transition-all duration-300 ease-out"
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
              <div className="pt-2 border-t border-white/6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">Auto-update</span>
                    <span className="text-xs text-foreground-muted">
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
                  className="block text-center text-xs text-accent hover:text-accent/80 transition-colors pt-1"
                >
                  View release notes →
                </a>
              )}
            </div>
          </div>
        </Portal>
      )}

      {/* Confirmation Dialog */}
      <UpdateConfirmDialog
        isOpen={dialogOpen}
        onConfirm={handleConfirmUpdate}
        onCancel={handleCancelUpdate}
        currentVersion={displayVersion}
        newVersion={displayLatestVersion || ''}
        isAutoUpdate={isAutoUpdateTrigger}
      />

      {/* Progress Modal */}
      <UpdateProgressModal
        isOpen={showProgressModal || isUpdating}
        onClose={() => setShowProgressModal(false)}
        onRetry={handleRetryUpdate}
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
