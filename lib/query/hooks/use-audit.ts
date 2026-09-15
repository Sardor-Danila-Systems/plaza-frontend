import { useQuery } from "@tanstack/react-query";
import { auditApi, type ListAuditFilters } from "@/lib/api/audit";
import { qk } from "@/lib/query/keys";
import { useProject } from "@/lib/project/project-context";

export function useAuditLog(filters: ListAuditFilters) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.audit.list(projectId!, filters),
    queryFn: () => auditApi.list(projectId!, filters),
    enabled: !!projectId,
  });
}
