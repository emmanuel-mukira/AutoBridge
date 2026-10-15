import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import type { FilterCondition, FilterConfig, FilterOperator } from "@/lib/filtering/types";
import { getDefaultOperatorForType } from "@/lib/filtering/filterUtils";

interface ColumnFilterProps<T> {
  config: FilterConfig<T>;
  value?: FilterCondition;
  onChange: (condition: FilterCondition | null) => void;
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: "Equals",
  notEquals: "Not Equals",
  contains: "Contains",
  notContains: "Does Not Contain",
  startsWith: "Starts With",
  endsWith: "Ends With",
  greaterThan: "Greater Than",
  lessThan: "Less Than",
  greaterThanOrEqual: "Greater Than or Equal",
  lessThanOrEqual: "Less Than or Equal",
  between: "Between",
  in: "In",
  notIn: "Not In",
  isEmpty: "Is Empty",
  isNotEmpty: "Is Not Empty",
};

export function ColumnFilter<T>({ config, value, onChange }: ColumnFilterProps<T>) {
  const [open, setOpen] = useState(false);
  const [operator, setOperator] = useState<FilterOperator>(
    value?.operator || getDefaultOperatorForType(config.type)
  );
  const [filterValue, setFilterValue] = useState<string>(
    value?.value ? String(value.value) : ""
  );

  useEffect(() => {
    if (value) {
      setOperator(value.operator);
      setFilterValue(value.value ? String(value.value) : "");
    }
  }, [value]);

  const availableOperators = config.operators || getDefaultOperators(config.type);

  const handleApply = () => {
    if (!filterValue && operator !== "isEmpty" && operator !== "isNotEmpty") {
      onChange(null);
      setOpen(false);
      return;
    }

    const condition: FilterCondition = {
      field: String(config.field),
      operator,
      value: parseValue(filterValue, config.type),
      type: config.type,
    };

    onChange(condition);
    setOpen(false);
  };

  const handleClear = () => {
    setFilterValue("");
    setOperator(getDefaultOperatorForType(config.type));
    onChange(null);
    setOpen(false);
  };

  const hasFilter = !!value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 px-2 ${hasFilter ? "text-primary" : "text-muted-foreground"}`}
        >
          <Filter className={`h-3 w-3 ${hasFilter ? "fill-primary" : ""}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">{config.label}</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operator" className="text-xs">
              Operator
            </Label>
            <Select value={operator} onValueChange={(v) => setOperator(v as FilterOperator)}>
              <SelectTrigger id="operator" className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableOperators.map((op) => (
                  <SelectItem key={op} value={op}>
                    {OPERATOR_LABELS[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {operator !== "isEmpty" && operator !== "isNotEmpty" && (
            <div className="space-y-2">
              <Label htmlFor="value" className="text-xs">
                Value
              </Label>
              {config.type === "select" && config.options ? (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger id="value" className="h-8">
                    <SelectValue placeholder={config.placeholder || "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {config.options.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : config.type === "date" ? (
                <Input
                  id="value"
                  type="date"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="h-8"
                />
              ) : config.type === "number" ? (
                <Input
                  id="value"
                  type="number"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder={config.placeholder || "Enter number..."}
                  className="h-8"
                />
              ) : (
                <Input
                  id="value"
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder={config.placeholder || "Enter value..."}
                  className="h-8"
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
            <Button onClick={handleApply} size="sm" className="h-7 text-xs">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getDefaultOperators(type: string): FilterOperator[] {
  switch (type) {
    case "text":
      return ["contains", "equals", "notEquals", "startsWith", "endsWith", "isEmpty", "isNotEmpty"];
    case "number":
      return ["equals", "notEquals", "greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "isEmpty", "isNotEmpty"];
    case "date":
      return ["equals", "notEquals", "greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual", "isEmpty", "isNotEmpty"];
    case "select":
      return ["equals", "notEquals", "isEmpty", "isNotEmpty"];
    case "multiSelect":
      return ["in", "notIn", "isEmpty", "isNotEmpty"];
    case "boolean":
      return ["equals"];
    default:
      return ["equals", "notEquals"];
  }
}

function parseValue(value: string, type: string): unknown {
  if (!value) return value;
  
  switch (type) {
    case "number":
      return Number(value);
    case "date":
      return value;
    case "boolean":
      return value === "true";
    default:
      return value;
  }
}
