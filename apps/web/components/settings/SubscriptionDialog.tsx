'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export interface SubscriptionOptions {
  claude: 'no' | 'yes' | 'max20';
  openai: 'yes' | 'no';
  gemini: 'yes' | 'no';
  copilot: 'yes' | 'no';
}

export interface SubscriptionDialogProps {
  isOpen: boolean;
  onConfirm: (subscriptions: SubscriptionOptions) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const DEFAULT_SUBSCRIPTIONS: SubscriptionOptions = {
  claude: 'no',
  openai: 'no',
  gemini: 'no',
  copilot: 'no',
};

export function SubscriptionDialog({
  isOpen,
  onConfirm,
  onCancel,
  isLoading,
}: SubscriptionDialogProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionOptions>(DEFAULT_SUBSCRIPTIONS);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSubscriptions(DEFAULT_SUBSCRIPTIONS);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const handleClaudeChange = (value: 'no' | 'yes' | 'max20') => {
    setSubscriptions((prev) => ({ ...prev, claude: value }));
  };

  const handleCheckboxChange = (key: 'openai' | 'gemini' | 'copilot', checked: boolean) => {
    setSubscriptions((prev) => ({ ...prev, [key]: checked ? 'yes' : 'no' }));
  };

  const handleSubmit = () => {
    onConfirm(subscriptions);
  };

  const handleBackdropClick = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={handleBackdropClick}
      onKeyDown={(e) => e.key === 'Escape' && !isLoading && onCancel()}
    >
      <div
        role="document"
        className="mx-4 w-full max-w-md rounded-lg bg-gray-900 p-6 text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6">
          <h2 id="subscription-dialog-title" className="text-xl font-semibold">
            Configure OhMyOpenCode
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Select your subscriptions to configure the AI coding assistant
          </p>
        </div>

        {/* Form Sections */}
        <div className="space-y-6">
          {/* Claude Radio Group */}
          <div role="group" aria-labelledby="claude-label">
            <label id="claude-label" className="block text-sm font-medium text-gray-300">
              Claude Subscription
            </label>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="claude"
                  value="no"
                  checked={subscriptions.claude === 'no'}
                  onChange={() => handleClaudeChange('no')}
                  disabled={isLoading}
                  className="h-4 w-4 border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">None</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="claude"
                  value="yes"
                  checked={subscriptions.claude === 'yes'}
                  onChange={() => handleClaudeChange('yes')}
                  disabled={isLoading}
                  className="h-4 w-4 border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Pro / Max</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="claude"
                  value="max20"
                  checked={subscriptions.claude === 'max20'}
                  onChange={() => handleClaudeChange('max20')}
                  disabled={isLoading}
                  className="h-4 w-4 border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Max 20x Mode</span>
              </label>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800" />

          {/* Other Subscriptions */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Other Subscriptions</label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={subscriptions.openai === 'yes'}
                onChange={(e) => handleCheckboxChange('openai', e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">OpenAI ChatGPT Plus</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={subscriptions.gemini === 'yes'}
                onChange={(e) => handleCheckboxChange('gemini', e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Google Gemini</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={subscriptions.copilot === 'yes'}
                onChange={(e) => handleCheckboxChange('copilot', e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">GitHub Copilot</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Installing...
              </>
            ) : (
              'Install'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
