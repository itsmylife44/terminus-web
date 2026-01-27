import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/version/versionChecker';

interface UpdateStatusResponse {
  status: 'ready' | 'updating';
  version: string;
}

// Import the isUpdating flag from the parent route
// Since we can't directly import module-level variables across files,
// we use a shared module approach
import { getUpdateStatus } from '../updateState';

export async function GET() {
  const response: UpdateStatusResponse = {
    status: getUpdateStatus() ? 'updating' : 'ready',
    version: APP_VERSION,
  };

  return NextResponse.json(response);
}
