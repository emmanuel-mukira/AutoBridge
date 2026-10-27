import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, Shield, User, AlertCircle } from "lucide-react";
import type { AuditLog } from "../types";
import { format } from "date-fns";

interface AuditLogListProps {
  logs: AuditLog[];
  isLoading: boolean;
  onViewDetails: (id: number) => void;
}

import type { LucideIcon } from "lucide-react";

const ACTION_CONFIG: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: LucideIcon; emoji: string }> = {
  LOGIN: { variant: "default", icon: User, emoji: "🔓" },
  LOGOUT: { variant: "secondary", icon: User, emoji: "🔒" },
  CUSTOMER_CREATED: { variant: "default", icon: User, emoji: "➕" },
  CUSTOMER_UPDATED: { variant: "secondary", icon: User, emoji: "✏️" },
  CUSTOMER_DELETED: { variant: "destructive", icon: AlertCircle, emoji: "🗑️" },
  LEAD_CREATED: { variant: "default", icon: User, emoji: "🎯" },
  LEAD_UPDATED: { variant: "secondary", icon: User, emoji: "📝" },
  LEAD_DELETED: { variant: "destructive", icon: AlertCircle, emoji: "❌" },
  QUOTATION_CREATED: { variant: "default", icon: User, emoji: "💰" },
  QUOTATION_UPDATED: { variant: "secondary", icon: User, emoji: "💵" },
  QUOTATION_DELETED: { variant: "destructive", icon: AlertCircle, emoji: "🚫" },
  INTERACTION_CREATED: { variant: "default", icon: User, emoji: "💬" },
  INTERACTION_UPDATED: { variant: "secondary", icon: User, emoji: "✍️" },
  INTERACTION_DELETED: { variant: "destructive", icon: AlertCircle, emoji: "🗑️" },
  USER_CREATED: { variant: "default", icon: Shield, emoji: "👤" },
  ROLE_CHANGED: { variant: "secondary", icon: Shield, emoji: "🔄" },
  STATUS_CHANGED: { variant: "secondary", icon: Shield, emoji: "⚡" },
  INVITE_SENT: { variant: "default", icon: User, emoji: "📧" },
  INVITE_ACCEPTED: { variant: "default", icon: User, emoji: "✅" },
};

export function AuditLogList({ logs, isLoading, onViewDetails }: AuditLogListProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No audit logs found.
      </div>
    );
  }

  const groupedByDate = logs.reduce((acc, log) => {
    const date = format(new Date(log.createdAt), "dd MMM, yyyy");
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, AuditLog[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, dateLogs]) => (
        <div key={date}>
          <div className="ps-2 my-2 first:mt-0">
            <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-neutral-400">
              {date}
            </h3>
          </div>

          <div className="space-y-3">
            {dateLogs.map((log) => {
              const config = ACTION_CONFIG[log.action] || { variant: "outline" as const, icon: User, emoji: "📋" };
              const firstName = log.user?.firstName ?? "System";
              const lastName = log.user?.lastName ?? "";
              const initials = `${firstName[0]}${lastName[0] ?? ""}`;

              return (
                <Card key={log.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {firstName} {lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{log.user?.email ?? "system"}</p>
                          </div>
                          <Badge variant={config.variant} className="shrink-0 w-fit text-xs">
                            <span className="inline-block">{config.emoji}</span>
                            <span className="ml-1 break-words">{log.action.replace(/_/g, " ")}</span>
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 break-words">
                          {log.description}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="font-mono text-xs break-all">
                              {format(new Date(log.createdAt), "PPpp")}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDetails(log.id)}
                            className="h-7 text-xs w-fit"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
