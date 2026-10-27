import type { FilterConfig } from "@/lib/filtering/types";

export interface AuditLogFilterData {
  userId?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export const auditLogFilterConfigs: FilterConfig<AuditLogFilterData>[] = [
  {
    field: "action",
    label: "Action",
    type: "select",
    options: [
      { label: "Login", value: "LOGIN" },
      { label: "Logout", value: "LOGOUT" },
      { label: "Customer Created", value: "CUSTOMER_CREATED" },
      { label: "Customer Updated", value: "CUSTOMER_UPDATED" },
      { label: "Customer Deleted", value: "CUSTOMER_DELETED" },
      { label: "Lead Created", value: "LEAD_CREATED" },
      { label: "Lead Updated", value: "LEAD_UPDATED" },
      { label: "Lead Deleted", value: "LEAD_DELETED" },
      { label: "Quotation Created", value: "QUOTATION_CREATED" },
      { label: "Quotation Updated", value: "QUOTATION_UPDATED" },
      { label: "Quotation Deleted", value: "QUOTATION_DELETED" },
      { label: "Interaction Created", value: "INTERACTION_CREATED" },
      { label: "Interaction Updated", value: "INTERACTION_UPDATED" },
      { label: "Interaction Deleted", value: "INTERACTION_DELETED" },
      { label: "User Created", value: "USER_CREATED" },
      { label: "Role Changed", value: "ROLE_CHANGED" },
      { label: "Status Changed", value: "STATUS_CHANGED" },
      { label: "Invite Sent", value: "INVITE_SENT" },
      { label: "Invite Accepted", value: "INVITE_ACCEPTED" },
    ],
  },
  {
    field: "startDate",
    label: "Start Date",
    type: "date",
  },
  {
    field: "endDate",
    label: "End Date",
    type: "date",
  },
];
