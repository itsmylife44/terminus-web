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
  updateSessionTitle,
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

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title || title.trim() === '') {
      return NextResponse.json({ success: false, error: 'Title cannot be empty' }, { status: 400 });
    }

    if (title.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Title must be 100 characters or less' },
        { status: 400 }
      );
    }

    const existingSession = getPtySession(id);
    if (!existingSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const updated = updateSessionTitle(id, title.trim());
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to rename PTY session:', error);
    const message = error instanceof Error ? error.message : 'Failed to rename session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const session = getPtySession(id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const OPENCODE_URL = process.env.OPENCODE_INTERNAL_URL || 'http://localhost:3001';
    const authHeader =
      process.env.OPENCODE_AUTH_USER && process.env.OPENCODE_AUTH_PASSWORD
        ? `Basic ${Buffer.from(`${process.env.OPENCODE_AUTH_USER}:${process.env.OPENCODE_AUTH_PASSWORD}`).toString('base64')}`
        : undefined;

    try {
      const killResponse = await fetch(`${OPENCODE_URL}/pty/${session.pty_id}`, {
        method: 'DELETE',
        headers: authHeader ? { Authorization: authHeader } : undefined,
      });

      if (!killResponse.ok && killResponse.status !== 404) {
        console.warn(`Failed to kill PTY process ${session.pty_id}: ${killResponse.status}`);
      }
    } catch (error) {
      console.warn('Failed to connect to PTY backend for process termination:', error);
    }

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
