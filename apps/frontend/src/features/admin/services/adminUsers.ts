import { http } from "@/lib/http";

export type AccountStatus = "PENDING" | "ACTIVE" | "DISABLED";
export type UserSummary = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "SALES_REP";
  status: AccountStatus;
  mustChangePassword: boolean;
  ownedClients: { id: number; businessName: string }[];
  createdAt: string;
};

export type UserInput = Pick<UserSummary, "firstName" | "lastName" | "email" | "role">;

export const adminUsersApi = {
  list: async () => (await http.get<{ users: UserSummary[] }>("/api/auth/users")).data.users,
  create: async (input: UserInput & { password: string }) => (await http.post<{ user: UserSummary }>("/api/auth/users", input)).data.user,
  update: async (id: number, input: UserInput) => (await http.patch<{ user: UserSummary }>(`/api/auth/users/${id}`, input)).data.user,
  status: async (id: number, status: "APPROVED" | "ACTIVE" | "DISABLED") => (await http.patch<{ user: UserSummary }>(`/api/auth/users/${id}/status`, { status })).data.user,
  resetPassword: async (id: number, temporaryPassword: string) => (await http.post<{ user: UserSummary }>(`/api/auth/users/${id}/reset-password`, { temporaryPassword })).data.user,
};
