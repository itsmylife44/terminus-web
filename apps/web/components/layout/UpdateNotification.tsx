'use client';

import { ArrowUpCircle } from 'lucide-react';
import { useVersionCheck } from '@/hooks/useVersionCheck';

export function UpdateNotification() {
  const { updateAvailable, latestVersion, releaseUrl, isLoading } = useVersionCheck();

  if (!updateAvailable || isLoading) {
    return null;
  }

  return (
    <a
      href={releaseUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
    >
      <ArrowUpCircle className="w-4 h-4" />
      <span>v{latestVersion} available</span>
    </a>
  );
}
