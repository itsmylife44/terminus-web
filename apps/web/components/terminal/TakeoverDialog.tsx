'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TakeoverDialogProps {
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  sessionTitle: string;
}

export function TakeoverDialog({ isOpen, onConfirm, onCancel, sessionTitle }: TakeoverDialogProps) {
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
      aria-labelledby="takeover-dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
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
            <h2 id="takeover-dialog-title" className="text-lg font-semibold text-foreground">
              Session in Use
            </h2>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <p className="text-foreground">This session is currently being used on another device.</p>

          <div className="rounded-md border border-white/6 bg-background-base p-3 text-sm">
            <p className="font-medium text-foreground">{sessionTitle}</p>
          </div>

          <p className="text-sm text-foreground-muted">
            Would you like to take it over? This will disconnect the other device.
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1" disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex-1" disabled={isLoading}>
            {isLoading ? 'Taking Over...' : 'Take Over'}
          </Button>
        </div>
      </div>
    </div>
  );
}
