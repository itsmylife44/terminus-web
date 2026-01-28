'use client';

import { useState } from 'react';
import type { OpenCodeProvider } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProviderListProps {
  providers: OpenCodeProvider[];
  onSaveApiKey: (providerId: string, apiKey: string) => Promise<void>;
  onRemoveAuth: (providerId: string) => Promise<void>;
  onOAuthInitiate: (providerId: string) => Promise<void>;
}

export function ProviderList({
  providers,
  onSaveApiKey,
  onRemoveAuth,
  onOAuthInitiate,
}: ProviderListProps) {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleApiKeyChange = (providerId: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [providerId]: value }));
  };

  const handleSaveApiKey = async (providerId: string) => {
    const apiKey = apiKeys[providerId]?.trim();
    if (!apiKey) return;

    setLoading((prev) => ({ ...prev, [providerId]: true }));
    try {
      await onSaveApiKey(providerId, apiKey);
      setApiKeys((prev) => ({ ...prev, [providerId]: '' }));
    } finally {
      setLoading((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const handleRemoveAuth = async (providerId: string) => {
    setLoading((prev) => ({ ...prev, [providerId]: true }));
    try {
      await onRemoveAuth(providerId);
    } finally {
      setLoading((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const handleOAuth = async (providerId: string) => {
    setLoading((prev) => ({ ...prev, [providerId]: true }));
    try {
      await onOAuthInitiate(providerId);
    } finally {
      setLoading((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {providers.map((provider) => (
        <Card
          key={provider.id}
          className="border-l-4"
          style={{
            borderLeftColor: provider.isConnected ? 'hsl(142 76% 36%)' : 'hsl(var(--border))',
          }}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{String(provider.name)}</CardTitle>
                <CardDescription>
                  {provider.isConnected ? (
                    <span className="text-green-600 font-medium">● Connected</span>
                  ) : (
                    <span className="text-muted-foreground">○ Not connected</span>
                  )}
                </CardDescription>
              </div>
              {provider.isConnected && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveAuth(provider.id)}
                  disabled={loading[provider.id]}
                >
                  {loading[provider.id] ? 'Removing...' : 'Disconnect'}
                </Button>
              )}
            </div>
          </CardHeader>
          {!provider.isConnected && (
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor={`api-key-${provider.id}`} className="text-sm font-medium">
                  API Key
                </label>
                <div className="flex gap-2">
                  <Input
                    id={`api-key-${provider.id}`}
                    type="password"
                    placeholder="Enter API key"
                    value={apiKeys[provider.id] || ''}
                    onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                    disabled={loading[provider.id]}
                  />
                  <Button
                    onClick={() => handleSaveApiKey(provider.id)}
                    disabled={!apiKeys[provider.id]?.trim() || loading[provider.id]}
                  >
                    {loading[provider.id] ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
              {provider.supportsOAuth && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuth(provider.id)}
                    disabled={loading[provider.id]}
                  >
                    {loading[provider.id] ? 'Connecting...' : `Connect with OAuth`}
                  </Button>
                </>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
