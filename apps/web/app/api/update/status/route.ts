import { NextResponse } from 'next/server';
import { readFreshVersion } from '@/lib/version/versionChecker.server';
import { getUpdateStatus } from '../updateState';

interface UpdateStatusResponse {
  status: 'ready' | 'updating';
  version: string;
}

export async function GET() {
  const isUpdating = await getUpdateStatus();
  const response: UpdateStatusResponse = {
    status: isUpdating ? 'updating' : 'ready',
    version: readFreshVersion(),
  };

  return NextResponse.json(response);
}
