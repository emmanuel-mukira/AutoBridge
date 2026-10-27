import type { FilterCondition, FilterOperator } from "./types";

export function applyFilter<T>(data: T[], condition: FilterCondition): T[] {
  if (!condition.value && condition.operator !== "isEmpty" && condition.operator !== "isNotEmpty") {
    return data;
  }

  return data.filter((item) => {
    const fieldValue = getNestedValue(item, condition.field);
    return matchesCondition(fieldValue, condition);
  });
}

export function applyFilters<T>(data: T[], conditions: FilterCondition[]): T[] {
  if (conditions.length === 0) return data;

  return conditions.reduce((filtered, condition) => {
    return applyFilter(filtered, condition);
  }, data);
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function matchesCondition(value: unknown, condition: FilterCondition): boolean {
  const { operator, value: filterValue, type } = condition;

  if (value === null || value === undefined) {
    return operator === "isEmpty";
  }

  if (operator === "isEmpty") {
    return value === null || value === undefined || value === "";
  }

  if (operator === "isNotEmpty") {
    return value !== null && value !== undefined && value !== "";
  }

  const stringValue = String(value).toLowerCase();
  const filterStringValue = String(filterValue).toLowerCase();

  switch (operator) {
    case "equals":
      if (type === "number") {
        return Number(value) === Number(filterValue);
      }
      if (type === "date") {
        return new Date(value as string).toDateString() === new Date(filterValue as string).toDateString();
      }
      return stringValue === filterStringValue;

    case "notEquals":
      if (type === "number") {
        return Number(value) !== Number(filterValue);
      }
      if (type === "date") {
        return new Date(value as string).toDateString() !== new Date(filterValue as string).toDateString();
      }
      return stringValue !== filterStringValue;

    case "contains":
      return stringValue.includes(filterStringValue);

    case "notContains":
      return !stringValue.includes(filterStringValue);

    case "startsWith":
      return stringValue.startsWith(filterStringValue);

    case "endsWith":
      return stringValue.endsWith(filterStringValue);

    case "greaterThan":
      if (type === "number") {
        return Number(value) > Number(filterValue);
      }
      if (type === "date") {
        return new Date(value as string) > new Date(filterValue as string);
      }
      return stringValue > filterStringValue;

    case "lessThan":
      if (type === "number") {
        return Number(value) < Number(filterValue);
      }
      if (type === "date") {
        return new Date(value as string) < new Date(filterValue as string);
      }
      return stringValue < filterStringValue;

    case "greaterThanOrEqual":
      if (type === "number") {
        return Number(value) >= Number(filterValue);
      }
      if (type === "date") {
        return new Date(value as string) >= new Date(filterValue as string);
      }
      return stringValue >= filterStringValue;

    case "lessThanOrEqual":
      if (type === "number") {
        return Number(value) <= Number(filterValue);
      }
      if (type === "date") {
        return new Date(value as string) <= new Date(filterValue as string);
      }
      return stringValue <= filterStringValue;

    case "in":
      if (Array.isArray(filterValue)) {
        return filterValue.some(v => String(v).toLowerCase() === stringValue);
      }
      return false;

    case "notIn":
      if (Array.isArray(filterValue)) {
        return !filterValue.some(v => String(v).toLowerCase() === stringValue);
      }
      return true;

    case "between":
      if (Array.isArray(filterValue) && filterValue.length === 2) {
        if (type === "number") {
          const numValue = Number(value);
          return numValue >= Number(filterValue[0]) && numValue <= Number(filterValue[1]);
        }
        if (type === "date") {
          const dateValue = new Date(value as string);
          return dateValue >= new Date(filterValue[0] as string) && dateValue <= new Date(filterValue[1] as string);
        }
      }
      return false;

    default:
      return true;
  }
}

export function getDefaultOperatorForType(type: string): FilterOperator {
  switch (type) {
    case "text":
      return "contains";
    case "number":
      return "equals";
    case "date":
      return "equals";
    case "select":
      return "equals";
    case "multiSelect":
      return "in";
    case "boolean":
      return "equals";
    default:
      return "equals";
  }
}
