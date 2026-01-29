'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, Trash2 } from 'lucide-react';
import {
  SubscriptionDialog,
  type SubscriptionOptions,
} from '@/components/settings/SubscriptionDialog';
import { ConfigEditor } from '@/components/settings/ConfigEditor';

interface OhMyOpenCodeStatus {
  installed: boolean;
  version?: string;
  error?: string;
}

export default function SettingsPage() {
  // OhMyOpenCode state
  const [omoStatus, setOmoStatus] = useState<OhMyOpenCodeStatus>({ installed: false });
  const [omoLoading, setOmoLoading] = useState(false);
  const [omoError, setOmoError] = useState<string | null>(null);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [confirmUninstallOpen, setConfirmUninstallOpen] = useState(false);

  // Fetch OhMyOpenCode status on mount
  useEffect(() => {
    const fetchOmoStatus = async () => {
      try {
        const response = await fetch('/api/oh-my-opencode');
        if (response.ok) {
          const data = await response.json();
          setOmoStatus(data);
        }
      } catch {
        setOmoStatus({ installed: false, error: 'Failed to check status' });
      }
    };
    fetchOmoStatus();
  }, []);

  const handleInstallOmo = async (subscriptions: SubscriptionOptions) => {
    setOmoLoading(true);
    setOmoError(null);

    try {
      const response = await fetch('/api/oh-my-opencode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'install',
          ...subscriptions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh status
        const statusResponse = await fetch('/api/oh-my-opencode');
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setOmoStatus(statusData);
        }
        setSubscriptionDialogOpen(false);
      } else {
        setOmoError(data.error || 'Installation failed');
      }
    } catch (error) {
      setOmoError(error instanceof Error ? error.message : 'Installation failed');
    } finally {
      setOmoLoading(false);
    }
  };

  const handleUninstallOmo = async () => {
    setOmoLoading(true);
    setOmoError(null);

    try {
      const response = await fetch('/api/oh-my-opencode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'uninstall' }),
      });

      const data = await response.json();

      if (data.success) {
        setOmoStatus({ installed: false });
        setConfirmUninstallOpen(false);
      } else {
        setOmoError(data.error || 'Uninstall failed');
      }
    } catch (error) {
      setOmoError(error instanceof Error ? error.message : 'Uninstall failed');
    } finally {
      setOmoLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground mt-1">Manage Terminus configuration</p>
        </div>
      </div>

      {/* OhMyOpenCode Card */}
      <Card>
        <CardHeader>
          <CardTitle>OhMyOpenCode</CardTitle>
          <CardDescription>AI coding assistant plugin for OpenCode</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Status</p>
              <div className="flex items-center gap-2 mt-1">
                {omoStatus.installed ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
                    </span>
                    <span className="text-sm text-green-400">
                      Installed {omoStatus.version && `v${omoStatus.version}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-500"></span>
                    <span className="text-sm text-gray-400">Not Installed</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {omoError && (
            <div className="rounded border border-red-900/50 bg-red-900/20 p-3">
              <p className="text-sm text-red-300">{omoError}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4 border-t">
            {omoStatus.installed ? (
              <Button
                type="button"
                onClick={() => setConfirmUninstallOpen(true)}
                disabled={omoLoading}
                variant="outline"
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
              >
                {omoLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Uninstall
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setSubscriptionDialogOpen(true)}
                disabled={omoLoading}
              >
                {omoLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Install
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Editor</CardTitle>
          <CardDescription>Edit OpenCode configuration files</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigEditor />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>System information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Frontend</p>
              <p className="font-mono">terminus-web</p>
            </div>
            <div>
              <p className="text-muted-foreground">Backend</p>
              <p className="font-mono">terminus-pty</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Dialog */}
      <SubscriptionDialog
        isOpen={subscriptionDialogOpen}
        onConfirm={handleInstallOmo}
        onCancel={() => setSubscriptionDialogOpen(false)}
        isLoading={omoLoading}
      />

      {confirmUninstallOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="uninstall-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => !omoLoading && setConfirmUninstallOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && !omoLoading && setConfirmUninstallOpen(false)}
        >
          <div
            role="document"
            className="mx-4 w-full max-w-md rounded-lg bg-background-elevated/80 backdrop-blur-xl border border-white/6 p-6 text-foreground shadow-card"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h2 id="uninstall-dialog-title" className="text-lg font-semibold text-foreground">
              Uninstall OhMyOpenCode?
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              This will remove OhMyOpenCode from your OpenCode configuration.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmUninstallOpen(false)}
                disabled={omoLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUninstallOmo}
                disabled={omoLoading}
                variant="destructive"
                className="flex-1"
              >
                {omoLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uninstalling...
                  </>
                ) : (
                  'Uninstall'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
