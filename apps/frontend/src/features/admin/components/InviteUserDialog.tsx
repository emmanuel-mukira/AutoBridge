import { memo, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inviteUser as apiInviteUser } from "@/features/admin/services/adminUsers";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  email: string;
  onSuccess: () => void;
}

/**
 * Dialog component for sending invites to users
 * Handles invite submission and error states
 */
export const InviteUserDialog = memo(function InviteUserDialog({
  open,
  onOpenChange,
  userId,
  email,
  onSuccess,
}: InviteUserDialogProps) {
  const [inviteEmail, setInviteEmail] = useState(email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update email when prop changes
  useEffect(() => {
    setInviteEmail(email);
  }, [email]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    
    if (!userId) {
      setError("Select a user to invite from the list.");
      return;
    }
    
    setLoading(true);
    try {
      await apiInviteUser(Number(userId));
      onOpenChange(false);
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send invite";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId, onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Invite</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1">
            <label className="text-sm" htmlFor="invite-email">
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}
        </div>
        <DialogFooter className="flex justify-between mt-4">
          <Button
            variant="ghost"
            onClick={() => {
              if (!loading) onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button variant="ghost" disabled={loading} onClick={handleSubmit}>
            {loading ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
