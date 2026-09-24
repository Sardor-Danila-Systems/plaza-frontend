import { apiFetch } from "@/lib/api/client";
import type { AnalyticsSummary, ConstructionAnalyticsRow, MaterialAnalyticsRow } from "@/lib/api/types";

export interface AnalyticsPeriodFilters {
  dateFrom?: string;
  dateTo?: string;
}

export const analyticsApi = {
  summary: (projectId: string, filters: AnalyticsPeriodFilters) =>
    apiFetch<AnalyticsSummary>(`/projects/${projectId}/analytics/summary`, {
      query: filters as Record<string, string | undefined>,
    }),

  materials: (projectId: string, filters: AnalyticsPeriodFilters & { materialId?: string }) =>
    apiFetch<{ projectId: string; dateFrom: string | null; dateTo: string | null; materials: MaterialAnalyticsRow[] }>(
      `/projects/${projectId}/analytics/materials`,
      { query: filters as Record<string, string | undefined> },
    ),

  construction: (
    projectId: string,
    filters: AnalyticsPeriodFilters & { blockId?: string; floorId?: string; wholeBlockOnly?: boolean },
  ) =>
    apiFetch<{ projectId: string; dateFrom: string | null; dateTo: string | null; rows: ConstructionAnalyticsRow[] }>(
      `/projects/${projectId}/analytics/construction`,
      { query: filters as Record<string, string | boolean | undefined> },
    ),
};
