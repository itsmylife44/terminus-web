/**
 * Single PTY Session API
 * GET /api/pty-sessions/[id] - Get session by ID
 * PUT /api/pty-sessions/[id] - Update session
 * DELETE /api/pty-sessions/[id] - Delete session
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPtySession,
  updatePtySession,
  deletePtySession,
  type PtySessionStatus,
} from '@/lib/db/pty-sessions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = getPtySession(id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Failed to get PTY session:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingSession = getPtySession(id);
    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { title, status, cols, rows } = body;

    // Validate status if provided
    if (status && !['active', 'disconnected', 'closed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: active, disconnected, or closed' },
        { status: 400 }
      );
    }

    const session = updatePtySession(id, {
      title,
      status: status as PtySessionStatus,
      cols,
      rows,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Failed to update PTY session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const deleted = deletePtySession(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete PTY session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
