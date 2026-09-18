import { useQuery } from "@tanstack/react-query";
import { analyticsApi, type AnalyticsPeriodFilters } from "@/lib/api/analytics";
import { qk } from "@/lib/query/keys";
import { useProject } from "@/lib/project/project-context";

export function useAnalyticsSummary(filters: AnalyticsPeriodFilters, options?: { enabled?: boolean }) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.analytics.summary(projectId!, filters),
    queryFn: () => analyticsApi.summary(projectId!, filters),
    enabled: !!projectId && (options?.enabled ?? true),
  });
}

export function useMaterialsAnalytics(filters: AnalyticsPeriodFilters & { materialId?: string }) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.analytics.materials(projectId!, filters),
    queryFn: () => analyticsApi.materials(projectId!, filters),
    enabled: !!projectId,
  });
}

export function useConstructionAnalytics(filters: AnalyticsPeriodFilters & { blockId?: string; floorId?: string }) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.analytics.construction(projectId!, filters),
    queryFn: () => analyticsApi.construction(projectId!, filters),
    enabled: !!projectId,
  });
}
