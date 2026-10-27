import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

interface FilterDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  children: ReactNode;
  onApply: () => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  variant?: "dialog" | "card";
}

export function FilterDialog({
  open,
  onOpenChange,
  title,
  children,
  onApply,
  onClear,
  hasActiveFilters,
  variant = "dialog",
}: FilterDialogProps) {
  if (variant === "card") {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">{title}</h3>
          </div>

          <div className="space-y-4">
            {children}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button onClick={onApply} size="sm">
              Apply Filters
            </Button>
            {hasActiveFilters && (
              <Button onClick={onClear} variant="outline" size="sm">
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {children}
        </div>

        <DialogFooter className="flex sm:justify-between items-center">
          <Button onClick={onClear} variant="ghost" size="sm" className="text-muted-foreground">
            <X className="h-4 w-4 mr-2" />
            Reset all
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancel
            </Button>
            <Button onClick={onApply}>
              Show Results
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
