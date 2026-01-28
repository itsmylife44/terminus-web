/**
 * PTY Sessions API
 * GET /api/pty-sessions - List all sessions
 * POST /api/pty-sessions - Create a new session
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getActivePtySessions,
  getAllPtySessions,
  createPtySession,
  type PtySessionStatus,
  type PtySession,
} from '@/lib/db/pty-sessions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as PtySessionStatus | null;
    const includeAll = searchParams.get('all') === 'true';

    let sessions: PtySession[];
    if (includeAll) {
      sessions = getAllPtySessions(status || undefined);
    } else {
      // By default, only return active and disconnected sessions
      sessions = getActivePtySessions();
    }

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Failed to get PTY sessions:', error);
    return NextResponse.json({ error: 'Failed to get sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { id, pty_id, title, cols, rows } = body;

    if (!id || !pty_id) {
      return NextResponse.json({ error: 'Missing required fields: id, pty_id' }, { status: 400 });
    }

    const session = createPtySession({
      id,
      pty_id,
      title,
      cols,
      rows,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Failed to create PTY session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}
