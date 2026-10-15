import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, UserCog, MessageSquare, FileText, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SalesRepHistoryEntry } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

interface SalesRepHistoryCardProps {
  history: SalesRepHistoryEntry[];
  loading?: boolean;
}

const getActivityIcon = (type: SalesRepHistoryEntry["type"]) => {
  switch (type) {
    case "ASSIGNMENT":
      return UserCog;
    case "INTERACTION":
      return MessageSquare;
    case "QUOTATION":
      return FileText;
    case "LEAD":
      return Target;
    default:
      return History;
  }
};

const getActivityColor = (type: SalesRepHistoryEntry["type"]) => {
  switch (type) {
    case "ASSIGNMENT":
      return "bg-blue-500";
    case "INTERACTION":
      return "bg-green-500";
    case "QUOTATION":
      return "bg-purple-500";
    case "LEAD":
      return "bg-orange-500";
    default:
      return "bg-gray-500";
  }
};

export const SalesRepHistoryCard = memo(function SalesRepHistoryCard({
  history,
  loading,
}: SalesRepHistoryCardProps) {
  if (loading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b bg-muted/5">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-primary" />
          Customer Engagement Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No activity history available
          </p>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => {
              const Icon = getActivityIcon(entry.type);
              return (
                <div
                  key={entry.id}
                  className="flex gap-3 pb-4 border-b last:border-b-0 last:pb-0"
                >
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-8 h-8 rounded-full ${getActivityColor(entry.type)}/10 flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 ${getActivityColor(entry.type).replace("bg-", "text-")}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {entry.type}
                      </Badge>
                      <p className="text-sm font-medium text-foreground flex-1">
                        {entry.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>
                        {entry.salesRep.firstName} {entry.salesRep.lastName}
                      </span>
                      <span>•</span>
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">
                        {new Date(entry.date).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
