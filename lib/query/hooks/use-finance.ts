import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financesApi, type ListFinanceFilters, type CreateFinancialTransactionInput } from "@/lib/api/finances";
import { qk } from "@/lib/query/keys";
import { useProject } from "@/lib/project/project-context";

export function useFinanceBalance() {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.finance.balance(projectId!),
    queryFn: () => financesApi.balance(projectId!),
    enabled: !!projectId,
  });
}

export function useFinanceList(filters: ListFinanceFilters) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.finance.list(projectId!, filters),
    queryFn: () => financesApi.list(projectId!, filters),
    enabled: !!projectId,
  });
}

export function useFinanceDetail(id: string) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.finance.detail(projectId!, id),
    queryFn: () => financesApi.get(projectId!, id),
    enabled: !!projectId && !!id,
  });
}

export function useFinanceCategories() {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.finance.categories(projectId!),
    queryFn: () => financesApi.categories(projectId!),
    enabled: !!projectId,
  });
}

export function useCurrencyRates() {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.finance.currencyRates(projectId!),
    queryFn: () => financesApi.currencyRates(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateFinanceTransaction() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreateFinancialTransactionInput; idempotencyKey: string }) =>
      financesApi.create(projectId!, body, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", projectId] });
    },
  });
}

export function useCancelFinanceTransaction() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, idempotencyKey }: { id: string; reason: string; idempotencyKey: string }) =>
      financesApi.cancel(projectId!, id, reason, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", projectId] });
    },
  });
}

export function useEditFinanceComment() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      financesApi.editComment(projectId!, id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance", projectId] });
    },
  });
}
