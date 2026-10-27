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
import { http } from "@/lib/http";
import { useAuth } from "@/app/auth/useAuth";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface CustomerFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    salesRepId?: number;
    countyName?: string;
    search?: string;
  };
  onFiltersChange: (filters: {
    salesRepId?: number;
    countyName?: string;
    search?: string;
  }) => void;
}

export function CustomerFilters({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: CustomerFiltersProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [users, setUsers] = useState<User[]>([]);
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (isAdmin) {
        try {
          const res = await http.get<{ users: User[] }>("/api/users");
          setUsers(res.data.users || []);
        } catch (error) {
          console.error("Failed to fetch users:", error);
        }
      }
    };
    fetchUsers();
  }, [isAdmin]);

  const handleApply = () => {
    const cleanFilters: {
      salesRepId?: number;
      countyName?: string;
      search?: string;
    } = {};
    
    if (localFilters.salesRepId) cleanFilters.salesRepId = localFilters.salesRepId;
    if (localFilters.countyName && localFilters.countyName.trim() !== "") {
      cleanFilters.countyName = localFilters.countyName.trim();
    }
    if (localFilters.search && localFilters.search.trim() !== "") {
      cleanFilters.search = localFilters.search.trim();
    }
    
    onFiltersChange(cleanFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    const emptyFilters = {
      salesRepId: undefined,
      countyName: undefined,
      search: "",
    };
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
            Filter Customers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Company name..."
                value={localFilters.search || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="county">County</Label>
              <Input
                id="county"
                placeholder="County name..."
                value={localFilters.countyName || ""}
                onChange={(e) => setLocalFilters({ ...localFilters, countyName: e.target.value })}
              />
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="salesRep">Sales Rep</Label>
                <Select
                  value={localFilters.salesRepId?.toString() || "all"}
                  onValueChange={(value) =>
                    setLocalFilters({ ...localFilters, salesRepId: value === "all" ? undefined : Number(value) })
                  }
                >
                  <SelectTrigger id="salesRep">
                    <SelectValue placeholder="All sales reps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sales reps</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
