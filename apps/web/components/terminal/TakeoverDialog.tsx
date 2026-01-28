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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onCancel}
    >
      <div
        role="document"
        className="w-full max-w-md rounded-lg bg-gray-900 p-6 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
          <div>
            <h2 id="takeover-dialog-title" className="text-lg font-semibold">
              Session in Use
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6 space-y-3">
          <p className="text-gray-300">This session is currently being used on another device.</p>

          <div className="rounded bg-gray-800 p-3 text-sm text-gray-400">
            <p className="font-medium text-white">{sessionTitle}</p>
          </div>

          <p className="text-sm text-gray-400">
            Would you like to take it over? This will disconnect the other device.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1" disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? 'Taking Over...' : 'Take Over'}
          </Button>
        </div>
      </div>
    </div>
  );
}
