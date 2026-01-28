'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { openCodeClient, type OpenCodeProvider } from '@/lib/api/client';
import { ProviderList } from '@/components/settings/ProviderList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<OpenCodeProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await openCodeClient.getProviders();
      setProviders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleSaveApiKey = async (providerId: string, apiKey: string) => {
    setError(null);
    setSuccessMessage(null);
    try {
      await openCodeClient.setProviderAuth(providerId, apiKey);
      setSuccessMessage('API key saved successfully');
      await loadProviders();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    }
  };

  const handleRemoveAuth = async (providerId: string) => {
    setError(null);
    setSuccessMessage(null);
    try {
      await openCodeClient.removeProviderAuth(providerId);
      setSuccessMessage('Provider disconnected successfully');
      await loadProviders();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect provider');
    }
  };

  const handleOAuthInitiate = async (providerId: string) => {
    setError(null);
    try {
      const { url } = await openCodeClient.initiateOAuth(providerId);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate OAuth');
    }
  };

  if (loading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Provider Configuration</h2>
          <p className="text-muted-foreground mt-1">
            Manage API keys and authentication for AI providers
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
          <p className="font-medium">Success</p>
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>AI Providers</CardTitle>
          <CardDescription>Configure authentication for each provider</CardDescription>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No providers available</p>
            </div>
          ) : (
            <ProviderList
              providers={providers}
              onSaveApiKey={handleSaveApiKey}
              onRemoveAuth={handleRemoveAuth}
              onOAuthInitiate={handleOAuthInitiate}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
