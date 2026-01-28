'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchConfig, saveConfig } from '@/lib/store/configSlice';
import { toggleAutoUpdate, showConfirmDialog } from '@/lib/store/updateSlice';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Check, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { APP_VERSION } from '@/lib/version/versionChecker';

type FormData = {
  model: string;
  theme: string;
  logLevel: string;
};

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { config, isLoading, isSaving, error } = useAppSelector((state) => state.config);
  const { autoUpdateEnabled, updateAvailable, latestVersion } = useAppSelector(
    (state) => state.update
  );
  const {
    updateAvailable: hookUpdateAvailable,
    latestVersion: hookLatestVersion,
    isLoading: versionLoading,
  } = useVersionCheck();

  const [formData, setFormData] = useState<FormData>({
    model: '',
    theme: 'dark',
    logLevel: 'info',
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [isCheckingVersion, setIsCheckingVersion] = useState(false);

  useEffect(() => {
    dispatch(fetchConfig());
  }, [dispatch]);

  useEffect(() => {
    if (config) {
      setFormData({
        model: (config.model as string) || '',
        theme: (config.theme as string) || 'dark',
        logLevel: (config.logLevel as string) || 'info',
      });
    }
  }, [config]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowSuccess(false);

    const result = await dispatch(saveConfig(formData));

    if (saveConfig.fulfilled.match(result)) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingVersion(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('terminus_version_check');
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsCheckingVersion(false);
  };

  const handleUpdateClick = () => {
    dispatch(showConfirmDialog(false));
  };

  const displayUpdateAvailable = updateAvailable || hookUpdateAvailable;
  const displayLatestVersion = latestVersion || hookLatestVersion;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground mt-1">Manage your OpenCode configuration</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>Modify core OpenCode parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="model" className="text-sm font-medium">
                Model Selection
              </label>
              <Input
                id="model"
                type="text"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="e.g., anthropic/claude-3-5-sonnet"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Provider and model configuration</p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Theme</legend>
              <div className="flex gap-2">
                {['dark', 'light', 'auto'].map((theme) => (
                  <Button
                    key={theme}
                    type="button"
                    variant={formData.theme === theme ? 'default' : 'outline'}
                    onClick={() => handleChange('theme', theme)}
                    className="capitalize"
                  >
                    {theme}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Visual appearance mode</p>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Log Level</legend>
              <div className="flex gap-2">
                {['debug', 'info', 'warn', 'error'].map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={formData.logLevel === level ? 'default' : 'outline'}
                    onClick={() => handleChange('logLevel', level)}
                    className="capitalize"
                  >
                    {level}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Diagnostic output verbosity</p>
            </fieldset>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            {showSuccess && (
              <div className="flex items-center gap-2 text-green-500 text-sm">
                <Check className="h-4 w-4" />
                <span>Configuration saved successfully</span>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground font-mono px-1">
        CONFIG_PATH: ~/.opencode/config.json
        {config?.version && <span className="ml-4">VERSION: {config.version}</span>}
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
              <p className="text-2xl font-mono mt-1">v{APP_VERSION}</p>
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
              disabled={isCheckingVersion || versionLoading}
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isCheckingVersion || versionLoading ? 'animate-spin' : ''}`}
              />
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
    </div>
  );
}
