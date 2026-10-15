import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { provisionUser as apiProvisionUser } from "@/features/admin/services/adminUsers";
import type { UserFormData } from "@/types/user";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * Dialog component for adding new sales representatives
 * Handles form state, validation, and submission
 */
export const AddUserDialog = memo(function AddUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddUserDialogProps) {
  const [form, setForm] = useState<UserFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    const fn = form.firstName.trim();
    const ln = form.lastName.trim();
    const em = form.email.trim();
    
    if (!fn || !ln || !em) {
      setError("First name, last name and email are required.");
      return;
    }
    
    setLoading(true);
    try {
      const fullPhone = form.phone ? `+254${form.phone}` : "";
      await apiProvisionUser({
        firstName: fn,
        lastName: ln,
        email: em,
        phone: fullPhone,
        role: "sales_rep",
      });
      onOpenChange(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "" });
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add sales rep";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [form, onOpenChange, onSuccess]);

  const handlePhoneChange = useCallback((value: string) => {
    // Remove leading 0 if present
    if (value.startsWith("0")) {
      value = value.slice(1);
    }
    // Only allow digits, max 9 digits
    value = value.replace(/\D/g, "").slice(0, 9);
    setForm((f) => ({ ...f, phone: value }));
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Sales Rep</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1">
            <label className="text-sm" htmlFor="firstName">
              First Name
            </label>
            <Input
              id="firstName"
              placeholder="Enter first name"
              value={form.firstName}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstName: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm" htmlFor="lastName">
              Last Name
            </label>
            <Input
              id="lastName"
              placeholder="Enter last name"
              value={form.lastName}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastName: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm" htmlFor="phone">
              Phone
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-black/60 dark:text-white/60">
                +254
              </span>
              <Input
                id="phone"
                type="tel"
                placeholder="712345678"
                value={form.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="pl-14"
                pattern="[17]\d{8}"
                title="Enter 9 digits starting with 7 or 1"
              />
            </div>
            <p className="text-xs text-black/60 dark:text-white/60">
              Enter 9 digits (e.g., 712345678 or 112345678)
            </p>
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
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
