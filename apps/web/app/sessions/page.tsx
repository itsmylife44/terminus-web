"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Terminal, ChevronLeft, ChevronRight } from "lucide-react";
import { openCodeClient, OpenCodeSession } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SESSIONS_PER_PAGE = 20;

/**
 * Session status badge component
 * Maps session status/state to visual indicator
 */
function StatusBadge({ session }: { session: OpenCodeSession }) {
  // Check various possible status fields
  const status = (session.status || session.state || "unknown") as string;
  
  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    running: { label: "Running", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    completed: { label: "Completed", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    failed: { label: "Failed", className: "bg-red-500/10 text-red-400 border-red-500/20" },
    error: { label: "Error", className: "bg-red-500/10 text-red-400 border-red-500/20" },
    paused: { label: "Paused", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    unknown: { label: "Unknown", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  };

  const config = statusConfig[status.toLowerCase()] || statusConfig.unknown;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}

/**
 * Format timestamp to readable format
 */
function formatTimestamp(timestamp: unknown): string {
  if (!timestamp) return "—";
  
  try {
    const date = new Date(timestamp as string | number);
    if (isNaN(date.getTime())) return "—";
    
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "—";
  }
}

/**
 * Truncate session ID for display
 */
function truncateId(id: string, length = 12): string {
  if (id.length <= length) return id;
  return `${id.substring(0, length)}...`;
}

function getMessageCount(session: OpenCodeSession): number {
  if (typeof session.message_count === 'number') return session.message_count;
  if (typeof session.messageCount === 'number') return session.messageCount;
  if (Array.isArray(session.messages)) return session.messages.length;
  return 0;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<OpenCodeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    const fetchSessionsData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const offset = (currentPage - 1) * SESSIONS_PER_PAGE;
        const fetchedSessions = await openCodeClient.getSessions(SESSIONS_PER_PAGE, offset);
        
        setSessions(fetchedSessions);
        // Note: API doesn't return total count yet, so we estimate based on results
        // If we get fewer than SESSIONS_PER_PAGE, we're on the last page
        if (fetchedSessions.length < SESSIONS_PER_PAGE) {
          setTotalSessions(offset + fetchedSessions.length);
        } else {
          // Estimate that there might be more pages
          setTotalSessions((currentPage + 1) * SESSIONS_PER_PAGE);
        }
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
        setError("Failed to load sessions. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionsData();
  }, [currentPage]);

  const totalPages = Math.ceil(totalSessions / SESSIONS_PER_PAGE);
  const hasNextPage = sessions.length === SESSIONS_PER_PAGE;
  const hasPrevPage = currentPage > 1;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sessions</h2>
          <p className="text-muted-foreground mt-1">
            View and manage all OpenCode sessions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center space-y-2 text-center text-muted-foreground">
              <Terminal className="h-12 w-12" />
              <p className="text-lg">No sessions found</p>
              <p className="text-sm">Sessions will appear here once created</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-4">Session ID</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3">Created</div>
                <div className="col-span-2">Messages</div>
                <div className="col-span-1"></div>
              </div>

              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  className="grid grid-cols-12 gap-4 px-4 py-3 rounded-lg border transition-all hover:bg-muted/50 hover:border-primary/30 items-center group"
                >
                  <div className="col-span-4 flex items-center space-x-3">
                    <div className="rounded-full bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                      <Terminal className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {truncateId(session.id)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {session.id}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <StatusBadge session={session} />
                  </div>

                  <div className="col-span-3 text-sm text-muted-foreground">
                    {formatTimestamp(session.created_at || session.createdAt || session.timestamp)}
                  </div>

                  <div className="col-span-2 text-sm text-muted-foreground">
                    {getMessageCount(session)} messages
                  </div>

                  <div className="col-span-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {sessions.length > 0 && (
            <div className="flex items-center justify-between pt-6 mt-6 border-t">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} {totalPages > 0 && `of ${totalPages}`}
                <span className="ml-2">({sessions.length} sessions)</span>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={!hasPrevPage}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!hasNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
