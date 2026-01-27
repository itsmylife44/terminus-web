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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg bg-gray-900 p-6 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <h2 className="text-lg font-semibold">
              {isAutoUpdate ? 'Auto-Update Detected' : 'Update Available'}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6 space-y-3">
          <p className="text-gray-300">
            {isAutoUpdate
              ? `Auto-update detected v${newVersion} available`
              : `Update to v${newVersion}?`}
          </p>

          <div className="rounded bg-gray-800 p-3 text-sm text-gray-400">
            <p className="mb-1">
              <span className="text-gray-500">Current:</span> v{currentVersion}
            </p>
            <p>
              <span className="text-gray-500">New:</span> v{newVersion}
            </p>
          </div>

          <div className="rounded border border-yellow-900/50 bg-yellow-900/20 p-3">
            <p className="text-sm text-yellow-200">
              ⚠️ This will restart the server. Active terminal sessions will be disconnected.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Update Now
          </Button>
        </div>
      </div>
    </div>
  );
}
