import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { writeOffsApi, type CreateWriteOffInput, type ListWriteOffsFilters } from "@/lib/api/write-offs";
import { qk } from "@/lib/query/keys";
import { useProject } from "@/lib/project/project-context";

export function useWriteOffs(filters: ListWriteOffsFilters = {}) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.writeOffs.list(projectId!, filters),
    queryFn: () => writeOffsApi.list(projectId!, filters),
    enabled: !!projectId,
  });
}

export function useWriteOff(id: string) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.writeOffs.detail(projectId!, id),
    queryFn: () => writeOffsApi.get(projectId!, id),
    enabled: !!projectId && !!id,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, projectId: string | null) {
  queryClient.invalidateQueries({ queryKey: ["write-offs", projectId] });
  queryClient.invalidateQueries({ queryKey: ["inventory", projectId] });
}

export function useCreateWriteOff() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreateWriteOffInput; idempotencyKey: string }) =>
      writeOffsApi.create(projectId!, body, idempotencyKey),
    onSuccess: () => invalidate(queryClient, projectId),
  });
}

export function useCancelWriteOff() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, idempotencyKey }: { id: string; reason: string; idempotencyKey: string }) =>
      writeOffsApi.cancel(projectId!, id, reason, idempotencyKey),
    onSuccess: () => invalidate(queryClient, projectId),
  });
}
