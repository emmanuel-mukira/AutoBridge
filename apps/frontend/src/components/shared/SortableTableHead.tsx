import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";

interface SortableTableHeadProps {
  field: string;
  label: string;
  sortDirection: "asc" | "desc" | null;
  onSort: (field: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function SortableTableHead({
  field,
  label,
  sortDirection,
  onSort,
  className,
  children,
}: SortableTableHeadProps) {
  return (
    <TableHead className={className}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSort(field)}
          className="flex items-center gap-1 hover:text-foreground transition-colors group"
        >
          <span>{label}</span>
          {sortDirection === null && (
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
          )}
          {sortDirection === "asc" && (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          )}
          {sortDirection === "desc" && (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          )}
        </button>
        {children}
      </div>
    </TableHead>
  );
}
