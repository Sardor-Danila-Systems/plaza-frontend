import { apiFetch } from "@/lib/api/client";
import type { AuditLog, Paginated } from "@/lib/api/types";

export interface ListAuditFilters {
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export const auditApi = {
  list: (projectId: string, filters: ListAuditFilters) =>
    apiFetch<Paginated<AuditLog>>(`/projects/${projectId}/audit`, {
      query: filters as Record<string, string | number | undefined>,
    }),

  get: (projectId: string, id: string) => apiFetch<AuditLog>(`/projects/${projectId}/audit/${id}`),
};
