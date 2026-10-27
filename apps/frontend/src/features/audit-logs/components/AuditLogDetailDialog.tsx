import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuditLog } from "../hooks/useAuditLogs";
import { format } from "date-fns";

interface AuditLogDetailDialogProps {
  logId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogDetailDialog({ logId, open, onOpenChange }: AuditLogDetailDialogProps) {
  const { data: log, isLoading } = useAuditLog(logId);

  if (isLoading || !log) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
            <p className="text-sm font-mono">
              {format(new Date(log.createdAt), "PPpp")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">User</p>
              <p className="text-sm font-semibold">
                {log.user?.firstName ?? "System"} {log.user?.lastName ?? ""}
              </p>
              <p className="text-xs text-muted-foreground">{log.user?.email ?? "system"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Action</p>
              <Badge variant="outline">{log.action.replace(/_/g, " ")}</Badge>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="text-sm mt-1">{log.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">IP Address</p>
              <p className="text-sm font-mono">
                {log.ipAddress || <span className="text-muted-foreground">Not recorded</span>}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Log ID</p>
              <p className="text-sm font-mono">#{log.id}</p>
            </div>
          </div>

          {log.userAgent && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">User Agent</p>
              <p className="text-xs font-mono text-muted-foreground break-all">
                {log.userAgent}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
