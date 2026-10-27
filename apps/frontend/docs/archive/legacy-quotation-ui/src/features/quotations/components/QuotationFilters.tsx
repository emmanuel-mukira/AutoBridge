import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { QUOTATION_STATUSES } from "@/types/quotation";

interface QuotationFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    status: string;
    version: string;
    search: string;
  };
  onFiltersChange: (filters: { status: string; version: string; search: string }) => void;
  uniqueVersions: number[];
}

export function QuotationFilters({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  uniqueVersions,
}: QuotationFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const handleApply = () => {
    const cleanFilters: {
      status: string;
      version: string;
      search: string;
    } = {
      status: localFilters.status,
      version: localFilters.version,
      search: localFilters.search.trim(),
    };
    
    onFiltersChange(cleanFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    const emptyFilters = { status: "all", version: "all", search: "" };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Quotations
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Quote number or customer..."
                value={localFilters.search}
                onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={localFilters.status}
                onValueChange={(value) => setLocalFilters({ ...localFilters, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {QUOTATION_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Select
                value={localFilters.version}
                onValueChange={(value) => setLocalFilters({ ...localFilters, version: value })}
              >
                <SelectTrigger id="version">
                  <SelectValue placeholder="All Versions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Versions</SelectItem>
                  {uniqueVersions.map((version) => (
                    <SelectItem key={version} value={version.toString()}>
                      Version {version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center">
          <Button onClick={handleClear} variant="ghost" size="sm" className="text-muted-foreground">
            <X className="h-4 w-4 mr-2" />
            Reset all
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Show Results
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
