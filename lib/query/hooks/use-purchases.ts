import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { purchasesApi, type CreatePurchaseInput, type ListPurchasesFilters } from "@/lib/api/purchases";
import { qk } from "@/lib/query/keys";
import { useProject } from "@/lib/project/project-context";

export function usePurchases(filters: ListPurchasesFilters = {}) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.purchases.list(projectId!, filters),
    queryFn: () => purchasesApi.list(projectId!, filters),
    enabled: !!projectId,
  });
}

export function usePurchase(id: string) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.purchases.detail(projectId!, id),
    queryFn: () => purchasesApi.get(projectId!, id),
    enabled: !!projectId && !!id,
  });
}

/** Purchases touch nearly every domain: materials arrive in inventory,
 * debt/advance shift on the supplier, cash moves in finance. */
function invalidateAfterPurchaseMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string | null,
) {
  queryClient.invalidateQueries({ queryKey: ["purchases", projectId] });
  queryClient.invalidateQueries({ queryKey: ["inventory", projectId] });
  queryClient.invalidateQueries({ queryKey: ["suppliers", projectId] });
  queryClient.invalidateQueries({ queryKey: ["finance", projectId] });
}

export function useCreatePurchase() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreatePurchaseInput; idempotencyKey: string }) =>
      purchasesApi.create(projectId!, body, idempotencyKey),
    onSuccess: () => invalidateAfterPurchaseMutation(queryClient, projectId),
  });
}

export function useCancelPurchase() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, idempotencyKey }: { id: string; reason: string; idempotencyKey: string }) =>
      purchasesApi.cancel(projectId!, id, reason, idempotencyKey),
    onSuccess: () => invalidateAfterPurchaseMutation(queryClient, projectId),
  });
}

export function useEditPurchaseComment() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      purchasesApi.editComment(projectId!, id, comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchases", projectId] }),
  });
}
