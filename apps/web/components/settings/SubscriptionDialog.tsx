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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onKeyDown={(e) => e.key === 'Escape' && !isLoading && onCancel()}
    >
      <div
        role="document"
        className="mx-4 w-full max-w-md rounded-lg bg-background-elevated/80 backdrop-blur-xl border border-white/6 p-6 text-foreground shadow-card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h2 id="subscription-dialog-title" className="text-xl font-semibold text-foreground">
            Configure OhMyOpenCode
          </h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Select your subscriptions to configure the AI coding assistant
          </p>
        </div>

        <div className="space-y-6">
          <fieldset>
            <legend className="block text-sm font-medium text-foreground">
              Claude Subscription
            </legend>
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors">
                <input
                  type="radio"
                  name="claude"
                  value="no"
                  checked={subscriptions.claude === 'no'}
                  onChange={() => handleClaudeChange('no')}
                  disabled={isLoading}
                  className="h-4 w-4 border-white/20 bg-background text-accent focus:ring-2 focus:ring-accent"
                />
                <span className="text-sm text-foreground">None</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors">
                <input
                  type="radio"
                  name="claude"
                  value="yes"
                  checked={subscriptions.claude === 'yes'}
                  onChange={() => handleClaudeChange('yes')}
                  disabled={isLoading}
                  className="h-4 w-4 border-white/20 bg-background text-accent focus:ring-2 focus:ring-accent"
                />
                <span className="text-sm text-foreground">Pro / Max</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors">
                <input
                  type="radio"
                  name="claude"
                  value="max20"
                  checked={subscriptions.claude === 'max20'}
                  onChange={() => handleClaudeChange('max20')}
                  disabled={isLoading}
                  className="h-4 w-4 border-white/20 bg-background text-accent focus:ring-2 focus:ring-accent"
                />
                <span className="text-sm text-foreground">Max 20x Mode</span>
              </label>
            </div>
          </fieldset>

          <div className="border-t border-white/6" />

          <fieldset className="space-y-3">
            <legend className="block text-sm font-medium text-foreground">
              Other Subscriptions
            </legend>

            <label className="flex cursor-pointer items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors">
              <input
                type="checkbox"
                checked={subscriptions.openai === 'yes'}
                onChange={(e) => handleCheckboxChange('openai', e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-white/20 bg-background text-accent focus:ring-2 focus:ring-accent"
              />
              <span className="text-sm text-foreground">OpenAI ChatGPT Plus</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors">
              <input
                type="checkbox"
                checked={subscriptions.gemini === 'yes'}
                onChange={(e) => handleCheckboxChange('gemini', e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-white/20 bg-background text-accent focus:ring-2 focus:ring-accent"
              />
              <span className="text-sm text-foreground">Google Gemini</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors">
              <input
                type="checkbox"
                checked={subscriptions.copilot === 'yes'}
                onChange={(e) => handleCheckboxChange('copilot', e.target.checked)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-white/20 bg-background text-accent focus:ring-2 focus:ring-accent"
              />
              <span className="text-sm text-foreground">GitHub Copilot</span>
            </label>
          </fieldset>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
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
