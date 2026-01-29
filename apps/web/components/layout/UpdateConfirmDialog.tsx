'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UpdateConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  currentVersion: string;
  newVersion: string;
  isAutoUpdate: boolean;
}

export function UpdateConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  currentVersion,
  newVersion,
  isAutoUpdate,
}: UpdateConfirmDialogProps) {
  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-dialog-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onCancel}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <div
        role="document"
        className="w-full max-w-md rounded-lg bg-background-elevated/80 backdrop-blur-xl border border-white/6 p-6 text-foreground shadow-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
          <div>
            <h2 id="update-dialog-title" className="text-lg font-semibold text-foreground">
              {isAutoUpdate ? 'Auto-Update Detected' : 'Update Available'}
            </h2>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <p className="text-foreground">
            {isAutoUpdate
              ? `Auto-update detected v${newVersion} available`
              : `Update to v${newVersion}?`}
          </p>

          <div className="rounded-md border border-white/6 bg-background-base p-3 text-sm text-foreground-muted">
            <p className="mb-1">
              <span className="text-foreground-muted">Current:</span> v{currentVersion}
            </p>
            <p>
              <span className="text-foreground-muted">New:</span> v{newVersion}
            </p>
          </div>

          <div className="rounded-md border border-yellow-500/20 bg-yellow-500/10 p-3">
            <p className="text-sm text-yellow-300">
              ⚠️ This will restart the server. Active terminal sessions will be disconnected.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="flex-1">
            Update Now
          </Button>
        </div>
      </div>
    </div>
  );
}
