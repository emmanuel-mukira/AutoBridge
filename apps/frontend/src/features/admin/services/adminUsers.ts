// Admin Users API services
// Centralizes fetch logic and error handling for admin user operations.

export type UserSummary = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: number;
  role: {
    name: string;
  };
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
};

export type ListUsersResponse = { users: UserSummary[] };
export type ProvisionPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role?: "admin" | "sales_rep";
};
export type ProvisionResponse = { user: UserSummary };
export type ApiError = { error?: string; message?: string };

import { http } from "@/lib/http";

// HTTP client handles errors; we simply rethrow message

// --- Public API Functions ---

/**
 * Fetches all users (admin-only)
 */
export async function listUsers(): Promise<ListUsersResponse> {
  const res = await http.get<ListUsersResponse>("/api/users");
  return res.data;
}

/**
 * Provisions a new user account
 */
export async function provisionUser(payload: ProvisionPayload): Promise<ProvisionResponse> {
  const res = await http.post<ProvisionResponse>("/api/users", payload);
  return res.data;
}

/**
 * Sends an invite email to an existing user
 */
export async function inviteUser(userId: number): Promise<{ user: UserSummary }> {
  const res = await http.post<{ user: UserSummary }>(`/api/users/${userId}/invite`);
  return res.data;
}

/**
 * Updates a user's role
 */
export async function changeUserRole(
  userId: number,
  role: "admin" | "sales_rep"
): Promise<{ user: UserSummary }> {
  const res = await http.patch<{ user: UserSummary }>(`/api/users/${userId}/role`, { role });
  return res.data;
}

/**
 * Changes a user's account status
 */
export async function changeUserStatus(
  userId: number,
  status: "PENDING" | "ACTIVE" | "SUSPENDED",
): Promise<{ user: UserSummary }> {
  const res = await http.patch<{ user: UserSummary }>(`/api/users/${userId}/status`, { status });
  return res.data;
}
