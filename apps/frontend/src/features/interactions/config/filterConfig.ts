import type { FilterConfig } from "@/lib/filtering/types";

export interface InteractionFilterData {
  type?: string;
  salesRepId?: number;
  customerId?: number;
  startDate?: string;
  endDate?: string;
}

export const interactionFilterConfigs: FilterConfig<InteractionFilterData>[] = [
  {
    field: "type",
    label: "Interaction Type",
    type: "select",
    options: [
      { label: "Call", value: "CALL" },
      { label: "Email", value: "EMAIL" },
      { label: "Meeting", value: "MEETING" },
      { label: "Site Visit", value: "SITE_VISIT" },
      { label: "Follow Up", value: "FOLLOW_UP" },
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
