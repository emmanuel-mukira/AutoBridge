import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { FilterCondition, FilterOperator } from "@/lib/filtering/types";

interface FilterBadgeProps {
  condition: FilterCondition;
  onRemove: () => void;
  label: string;
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: "equals",
  notEquals: "not equals",
  contains: "contains",
  notContains: "does not contain",
  startsWith: "starts with",
  endsWith: "ends with",
  greaterThan: ">",
  lessThan: "<",
  greaterThanOrEqual: ">=",
  lessThanOrEqual: "<=",
  between: "between",
  in: "in",
  notIn: "not in",
  isEmpty: "is empty",
  isNotEmpty: "is not empty",
};

function formatFilterValue(value: unknown): string {
  if (value === null || value === undefined) return "empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.map(v => formatFilterValue(v)).join(", ");
  }
  if (typeof value === "string") {
    const date = new Date(value);
    if (!isNaN(date.getTime()) && value.includes("-") && value.length >= 10) {
      return date.toLocaleDateString();
    }
    const statusMap: Record<string, string> = {
      "PENDING": "Pending",
      "ACTIVE": "Active",
      "SUSPENDED": "Suspended",
      "DRAFT": "Draft",
      "SENT": "Sent",
      "ACCEPTED": "Accepted",
      "REJECTED": "Rejected",
      "SUPERSEDED": "Superseded",
      "admin": "Admin",
      "sales_rep": "Sales Rep",
      "active": "Active",
      "inactive": "Inactive",
      "suspended": "Suspended",
    };
    return statusMap[value] || value;
  }
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return String(value);
}

export function FilterBadge({ condition, onRemove, label }: FilterBadgeProps) {
  const operatorText = OPERATOR_LABELS[condition.operator] || condition.operator;
  const valueText = formatFilterValue(condition.value);
  const showValue = !["isEmpty", "isNotEmpty"].includes(condition.operator);

  return (
    <Badge variant="secondary" className="gap-2 pr-1 py-1">
      <span className="text-xs font-medium">
        {label}: {operatorText} {showValue && `"${valueText}"`}
      </span>
      <button
        onClick={onRemove}
        className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
        aria-label="Remove filter"
      >
        <X className="h-3 w-3 text-destructive" />
      </button>
    </Badge>
  );
}
