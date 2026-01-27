import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Terminal } from "lucide-react";

interface StatsCardsProps {
  totalSessions: number;
  activeSessions: number;
}

export function StatsCards({ totalSessions, activeSessions }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          <Terminal className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSessions}</div>
          <p className="text-xs text-muted-foreground">
            Lifetime created sessions
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeSessions}</div>
          <p className="text-xs text-muted-foreground">
            Currently running
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
