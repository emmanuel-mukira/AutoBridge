import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare } from "lucide-react";
import type { InteractionsByRep } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

interface InteractionsByRepCardProps {
  data: InteractionsByRep[];
  loading?: boolean;
}

export const InteractionsByRepCard = memo(function InteractionsByRepCard({
  data,
  loading,
}: InteractionsByRepCardProps) {
  if (loading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const sortedData = [...data].sort((a, b) => b.interactionCount - a.interactionCount);

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b bg-muted/5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" />
          Interactions by Sales Rep
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {sortedData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No interactions recorded
          </p>
        ) : (
          <div className="space-y-3">
            {sortedData.map((item) => (
              <div
                key={item.salesRepId}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {item.salesRep.firstName} {item.salesRep.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last: {new Date(item.latestInteraction).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{item.interactionCount}</p>
                  <p className="text-xs text-muted-foreground">interactions</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
