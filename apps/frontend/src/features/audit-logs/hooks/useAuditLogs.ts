import { useQuery } from "@tanstack/react-query";
import { auditLogsApi } from "../services/auditLogsApi";
import type { ListAuditLogsParams } from "../types";

const AUDIT_LOGS_QUERY_KEY = "audit-logs";

export function useAuditLogs(params?: ListAuditLogsParams) {
  return useQuery({
    queryKey: [AUDIT_LOGS_QUERY_KEY, params],
    queryFn: () => auditLogsApi.list(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useAuditLog(id: number) {
  return useQuery({
    queryKey: [AUDIT_LOGS_QUERY_KEY, id],
    queryFn: () => auditLogsApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
