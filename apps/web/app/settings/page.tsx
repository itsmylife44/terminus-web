'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { toggleAutoUpdate, showConfirmDialog } from '@/lib/store/updateSlice';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Download } from 'lucide-react';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { APP_VERSION } from '@/lib/version/versionChecker';

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { autoUpdateEnabled, updateAvailable, latestVersion } = useAppSelector(
    (state) => state.update
  );
  const {
    updateAvailable: hookUpdateAvailable,
    latestVersion: hookLatestVersion,
    isLoading: versionLoading,
    checkForUpdates,
  } = useVersionCheck();

  const [currentVersion, setCurrentVersion] = useState(APP_VERSION);

  useEffect(() => {
    const fetchCurrentVersion = async () => {
      try {
        const response = await fetch('/api/update/status');
        if (response.ok) {
          const data = await response.json();
          if (data.version) {
            setCurrentVersion(data.version);
          }
        }
      } catch {}
    };
    fetchCurrentVersion();
  }, []);

  const handleCheckForUpdates = async () => {
    await checkForUpdates();
  };

  const handleUpdateClick = () => {
    dispatch(showConfirmDialog(true));
  };

  const displayUpdateAvailable = updateAvailable || hookUpdateAvailable;
  const displayLatestVersion = latestVersion || hookLatestVersion;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground mt-1">Manage Terminus configuration</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Updates</CardTitle>
          <CardDescription>Software update configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Version</p>
              <p className="text-2xl font-mono mt-1">v{currentVersion}</p>
            </div>
            {displayUpdateAvailable && (
              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-sm font-medium">
                v{displayLatestVersion} Available
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="text-sm font-medium">Auto-Update</p>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically update when new version is available
              </p>
            </div>
            <Switch
              checked={autoUpdateEnabled}
              onCheckedChange={() => dispatch(toggleAutoUpdate())}
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={versionLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${versionLoading ? 'animate-spin' : ''}`} />
              Check for Updates
            </Button>

            {displayUpdateAvailable && (
              <Button type="button" onClick={handleUpdateClick}>
                <Download className="h-4 w-4 mr-2" />
                Update Now
              </Button>
            )}
          </div>
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
    </div>
  );
}
