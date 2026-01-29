'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionDeleteDialogProps {
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  sessionName: string;
}

export function SessionDeleteDialog({
  isOpen,
  onConfirm,
  onCancel,
  sessionName,
}: SessionDeleteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
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
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
          <div>
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-foreground">
              Close Session
            </h2>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <p className="text-foreground">
            Close session <span className="font-medium">"{sessionName}"</span>?
          </p>

          <p className="text-sm text-foreground-muted">
            Any running processes will be terminated. This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1" disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
            disabled={isLoading}
          >
            {isLoading ? 'Closing...' : 'Close Session'}
          </Button>
        </div>
      </div>
    </div>
  );
}
