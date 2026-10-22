import { http } from "@/lib/http";

export type InteractionType = "CALL" | "EMAIL" | "MEETING" | "SITE_VISIT" | "FOLLOW_UP";

type ActivityUser = { id: number; firstName: string; lastName: string; email: string; role: "ADMIN" | "SALES_REP" };
type ActivityClient = { id: number; businessName: string };
type ActivityOpportunity = { id: number; title: string } | null;

export interface Interaction {
  id: number;
  clientId: number;
  opportunityId: number | null;
  userId: number;
  interactionType: InteractionType;
  notes: string | null;
  occurredAt: string;
  createdAt: string;
  client: ActivityClient;
  opportunity: ActivityOpportunity;
  user: ActivityUser;
}

export interface FollowUp {
  id: number;
  clientId: number;
  opportunityId: number | null;
  ownerId: number;
  title: string;
  channel: InteractionType | null;
  dueAt: string;
  completedAt: string | null;
  createdAt: string;
  client: ActivityClient;
  opportunity: ActivityOpportunity;
  owner: ActivityUser;
}

export interface InteractionInput {
  clientId: number;
  opportunityId?: number | null;
  interactionType: InteractionType;
  notes?: string | null;
  occurredAt: string;
}

export interface FollowUpInput {
  clientId: number;
  opportunityId?: number | null;
  title: string;
  channel: InteractionType;
  dueAt: string;
}

export interface ActivityFilters {
  clientId?: number;
  opportunityId?: number;
  userId?: number;
  ownerId?: number;
  completed?: boolean;
  interactionType?: InteractionType;
}

export const activitiesApi = {
  listInteractions: async (filters: ActivityFilters = {}) => (await http.get<{ interactions: Interaction[]; pagination: { total: number } }>("/api/interactions", { params: filters })).data,
  createInteraction: async (input: InteractionInput) => (await http.post<Interaction>("/api/interactions", input)).data,
  updateInteraction: async (id: number, input: Partial<Pick<InteractionInput, "interactionType" | "notes" | "occurredAt">>) => (await http.patch<Interaction>(`/api/interactions/${id}`, input)).data,
  deleteInteraction: async (id: number) => { await http.delete(`/api/interactions/${id}`); },
  listFollowUps: async (filters: ActivityFilters = {}) => (await http.get<{ followUps: FollowUp[]; pagination: { total: number } }>("/api/follow-ups", { params: filters })).data,
  createFollowUp: async (input: FollowUpInput) => (await http.post<FollowUp>("/api/follow-ups", input)).data,
  updateFollowUp: async (id: number, input: Partial<Pick<FollowUpInput, "title" | "channel" | "dueAt">>) => (await http.patch<FollowUp>(`/api/follow-ups/${id}`, input)).data,
  completeFollowUp: async (id: number) => (await http.patch<FollowUp>(`/api/follow-ups/${id}/complete`, {})).data,
};
