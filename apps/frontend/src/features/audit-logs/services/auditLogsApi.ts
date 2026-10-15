import { http } from "@/lib/http";
import type {
  AuditLog,
  ListAuditLogsParams,
  AuditLogsResponse,
} from "../types";

export const auditLogsApi = {
  list: async (params?: ListAuditLogsParams): Promise<AuditLogsResponse> => {
    const response = await http.get<AuditLogsResponse>("/api/audit-logs", { params });
    return response.data;
  },

  getById: async (id: number): Promise<AuditLog> => {
    const response = await http.get<AuditLog>(`/api/audit-logs/${id}`);
    return response.data;
  },
};
