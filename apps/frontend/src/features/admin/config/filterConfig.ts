import type { FilterConfig } from "@/lib/filtering/types";
import type { SalesRep } from "@/types/user";

export const userFilterConfigs: FilterConfig<SalesRep>[] = [
  {
    field: "firstName",
    label: "First Name",
    type: "text",
    placeholder: "Search first name...",
  },
  {
    field: "lastName",
    label: "Last Name",
    type: "text",
    placeholder: "Search last name...",
  },
  {
    field: "email",
    label: "Email",
    type: "text",
    placeholder: "Search email...",
  },
  {
    field: "phone",
    label: "Phone",
    type: "text",
    placeholder: "Search phone...",
  },
  {
    field: "role",
    label: "Role",
    type: "select",
    options: [
      { label: "Admin", value: "admin" },
      { label: "Sales Rep", value: "sales_rep" },
    ],
  },
  {
    field: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
      { label: "Suspended", value: "suspended" },
    ],
  },
];
