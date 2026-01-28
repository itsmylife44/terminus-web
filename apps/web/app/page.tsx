'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { fetchPtySessions } from '@/lib/store/ptySessionsSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal, Activity, Clock } from 'lucide-react';

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { sessions, isLoading } = useAppSelector((state) => state.ptySessions);

  useEffect(() => {
    dispatch(fetchPtySessions());
  }, [dispatch]);

  const activeSessions = sessions.filter((s) => s.status === 'active').length;
  const totalSessions = sessions.length;

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <Link href="/terminal">
          <Button>
            <Terminal className="mr-2 h-4 w-4" />
            Open Terminal
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions}</div>
            <p className="text-xs text-muted-foreground">Currently connected terminals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Terminal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">Saved terminal sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PTY Backend</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Online</div>
            <p className="text-xs text-muted-foreground">terminus-pty server</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Terminal Sessions</CardTitle>
          <CardDescription>Your saved terminal sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No terminal sessions yet</p>
              <Link href="/terminal">
                <Button variant="outline">
                  <Terminal className="mr-2 h-4 w-4" />
                  Start a new session
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        session.status === 'active'
                          ? 'bg-green-500'
                          : session.status === 'disconnected'
                            ? 'bg-yellow-500'
                            : 'bg-gray-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(session.last_connected_at)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">{session.status}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
