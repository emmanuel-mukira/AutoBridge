export type FilterOperator = 
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual"
  | "between"
  | "in"
  | "notIn"
  | "isEmpty"
  | "isNotEmpty";

export type FilterType = 
  | "text"
  | "number"
  | "date"
  | "select"
  | "multiSelect"
  | "boolean";

export interface FilterCondition<T = unknown> {
  field: string;
  operator: FilterOperator;
  value: T;
  type: FilterType;
}

export interface FilterConfig<T = unknown> {
  field: keyof T | string;
  label: string;
  type: FilterType;
  operators?: FilterOperator[];
  options?: Array<{ label: string; value: string | number }>;
  placeholder?: string;
}

export interface FilterState<T = unknown> {
  conditions: FilterCondition[];
  data: T[];
  filteredData: T[];
}
