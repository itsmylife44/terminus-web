"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { openCodeClient, OpenCodeSession } from "@/lib/api/client";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [sessions, setSessions] = useState<OpenCodeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Fetch 5 most recent sessions
        const recentSessions = await openCodeClient.getSessions(5, 0);
        setSessions(recentSessions);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Calculate stats (in a real app, this might come from a separate API endpoint)
  const totalSessions = sessions.length; // This is just loaded sessions, strictly we'd need a count endpoint
  const activeSessions = sessions.filter((s) => s.status === "active" || s.state === "running").length;

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
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <StatsCards 
        totalSessions={totalSessions} 
        activeSessions={activeSessions} 
      />

      <RecentSessions sessions={sessions} />
    </div>
  );
}
