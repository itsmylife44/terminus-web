'use client';

import { useEffect, useState } from 'react';
import { openCodeClient, OpenCodeProvider } from '@/lib/api/client';
import { ProviderList } from '@/components/settings/ProviderList';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<OpenCodeProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
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
  };

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
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading providers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Provider Configuration
        </h1>
        <p className="text-muted-foreground">
          Manage API keys and authentication for AI providers
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400">
          <p className="font-medium">Success</p>
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      {providers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No providers available</p>
        </div>
      ) : (
        <ProviderList
          providers={providers}
          onSaveApiKey={handleSaveApiKey}
          onRemoveAuth={handleRemoveAuth}
          onOAuthInitiate={handleOAuthInitiate}
        />
      )}
    </div>
  );
}
