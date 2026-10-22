import type { FilterConfig } from "@/lib/filtering/types";
import type { Customer } from "../types";
import { CUSTOMER_CATEGORIES } from "../utils/categoryUtils";

export const customerFilterConfigs: FilterConfig<Customer>[] = [
  {
    field: "companyName",
    label: "Company Name",
    type: "text",
    placeholder: "Search company...",
  },
  {
    field: "countyName",
    label: "County",
    type: "text",
    placeholder: "Search county...",
  },
  {
    field: "locationAddress",
    label: "Location",
    type: "text",
    placeholder: "Search location...",
  },
  {
    field: "salesRep.firstName",
    label: "Sales Rep",
    type: "text",
    placeholder: "Search sales rep...",
  },
  {
    field: "category",
    label: "Category",
    type: "select",
    options: CUSTOMER_CATEGORIES.map((cat) => ({
      value: cat.value,
      label: cat.label,
    })),
  },
  {
    field: "createdAt",
    label: "Created Date",
    type: "date",
  },
];
