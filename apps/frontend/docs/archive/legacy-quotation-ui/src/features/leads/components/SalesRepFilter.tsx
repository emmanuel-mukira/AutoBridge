import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { http } from "@/lib/http";
import { Users } from "lucide-react";

interface SalesRep {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
}

interface SalesRepFilterProps {
  value: number | null;
  onChange: (salesRepId: number | null) => void;
}

export function SalesRepFilter({ value, onChange }: SalesRepFilterProps) {
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSalesReps() {
      try {
        const response = await http.get<{ users: SalesRep[] }>("/api/users");
        const activeSalesReps = response.data.users.filter(
          (user) => user.status === "ACTIVE"
        );
        setSalesReps(activeSalesReps);
      } catch (error) {
        console.error("Failed to fetch sales reps:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSalesReps();
  }, []);

  const handleValueChange = (val: string) => {
    if (val === "all") {
      onChange(null);
    } else {
      onChange(Number(val));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <Select
        value={value === null ? "all" : String(value)}
        onValueChange={handleValueChange}
        disabled={loading}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filter by sales rep" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sales Reps</SelectItem>
          {salesReps.map((rep) => (
            <SelectItem key={rep.id} value={String(rep.id)}>
              {rep.firstName} {rep.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
