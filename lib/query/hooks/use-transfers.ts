import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transfersApi, type CreateTransferInput, type ListTransfersFilters } from "@/lib/api/transfers";
import { qk } from "@/lib/query/keys";
import { useProject } from "@/lib/project/project-context";

export function useTransfers(filters: ListTransfersFilters = {}) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.transfers.list(projectId!, filters),
    queryFn: () => transfersApi.list(projectId!, filters),
    enabled: !!projectId,
  });
}

export function useTransfer(id: string) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.transfers.detail(projectId!, id),
    queryFn: () => transfersApi.get(projectId!, id),
    enabled: !!projectId && !!id,
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, projectId: string | null) {
  queryClient.invalidateQueries({ queryKey: ["transfers", projectId] });
  queryClient.invalidateQueries({ queryKey: ["inventory", projectId] });
}

export function useCreateTransfer() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreateTransferInput; idempotencyKey: string }) =>
      transfersApi.create(projectId!, body, idempotencyKey),
    onSuccess: () => invalidate(queryClient, projectId),
  });
}

export function useCancelTransfer() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, idempotencyKey }: { id: string; reason: string; idempotencyKey: string }) =>
      transfersApi.cancel(projectId!, id, reason, idempotencyKey),
    onSuccess: () => invalidate(queryClient, projectId),
  });
}
