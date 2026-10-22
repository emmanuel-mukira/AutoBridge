import type { FilterConfig } from "@/lib/filtering/types";
import type { Quotation } from "@/types/quotation";

export const quotationFilterConfigs: FilterConfig<Quotation>[] = [
  {
    field: "quoteNumber",
    label: "Quote Number",
    type: "text",
    placeholder: "Search quote number...",
  },
  {
    field: "version",
    label: "Version",
    type: "number",
    placeholder: "Version number...",
  },
  {
    field: "customer.companyName",
    label: "Customer",
    type: "text",
    placeholder: "Search customer...",
  },
  {
    field: "totalPrice",
    label: "Total Price",
    type: "number",
    placeholder: "Amount...",
  },
  {
    field: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Draft", value: "DRAFT" },
      { label: "Sent", value: "SENT" },
      { label: "Accepted", value: "ACCEPTED" },
      { label: "Rejected", value: "REJECTED" },
      { label: "Superseded", value: "SUPERSEDED" },
    ],
  },
  {
    field: "salesRep.firstName",
    label: "Sales Rep",
    type: "text",
    placeholder: "Search sales rep...",
  },
  {
    field: "createdAt",
    label: "Created Date",
    type: "date",
  },
];
