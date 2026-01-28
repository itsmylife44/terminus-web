import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Terminal } from 'lucide-react';
import type { OpenCodeSession } from '@/lib/api/client';

interface RecentSessionsProps {
  sessions: OpenCodeSession[];
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Sessions</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href="/terminal">
            View All <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center space-y-2 text-center text-muted-foreground">
            <Terminal className="h-8 w-8" />
            <p>No recent sessions found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Terminal className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium leading-none">
                      {/* Use ID or name if available in the future */}
                      Session {session.id.substring(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {/* Assuming created_at or similar field might exist, else just show ID */}
                      {/* This will need adjustment based on actual API response structure */}
                      ID: {session.id}
                    </p>
                  </div>
                </div>
                {/* 
                  Add timestamp if available in session object
                  <div className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                  </div> 
                */}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
