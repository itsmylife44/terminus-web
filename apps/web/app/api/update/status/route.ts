import { NextResponse } from 'next/server';
import { readFreshVersion } from '@/lib/version/versionChecker.server';
import { getUpdateStatus } from '../updateState';

interface UpdateStatusResponse {
  status: 'ready' | 'updating';
  version: string;
}

export async function GET() {
  const response: UpdateStatusResponse = {
    status: getUpdateStatus() ? 'updating' : 'ready',
    version: readFreshVersion(),
  };

  return NextResponse.json(response);
}
