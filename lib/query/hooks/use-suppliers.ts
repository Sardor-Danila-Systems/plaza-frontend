import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  suppliersApi,
  type CreateSupplierInput,
  type UpdateSupplierInput,
  type CreateSupplierAdvanceInput,
  type CreateDebtPaymentInput,
} from "@/lib/api/suppliers";
import { qk } from "@/lib/query/keys";
import { useProject } from "@/lib/project/project-context";
import { readKnownAdvances, rememberAdvance } from "@/lib/local/known-advances";

export function useSuppliers() {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.suppliers.list(projectId!),
    queryFn: () => suppliersApi.list(projectId!),
    enabled: !!projectId,
  });
}

export function useSupplier(id: string) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.suppliers.detail(projectId!, id),
    queryFn: () => suppliersApi.get(projectId!, id),
    enabled: !!projectId && !!id,
  });
}

export function useSupplierLedger(id: string) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.suppliers.ledger(projectId!, id),
    queryFn: () => suppliersApi.ledger(projectId!, id),
    enabled: !!projectId && !!id,
  });
}

export function useCreateSupplier() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSupplierInput) => suppliersApi.create(projectId!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers", projectId] }),
  });
}

export function useUpdateSupplier() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSupplierInput }) =>
      suppliersApi.update(projectId!, id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers", projectId] }),
  });
}

export function useCreateSupplierAdvance() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplierId,
      body,
      idempotencyKey,
    }: {
      supplierId: string;
      body: CreateSupplierAdvanceInput;
      idempotencyKey: string;
    }) => suppliersApi.createAdvance(projectId!, supplierId, body, idempotencyKey),
    onSuccess: (advance, { supplierId }) => {
      rememberAdvance(supplierId, advance);
      queryClient.invalidateQueries({ queryKey: ["suppliers", projectId] });
      queryClient.invalidateQueries({ queryKey: ["finance", projectId] });
    },
  });
}

/** See lib/local/known-advances.ts — the backend has no list endpoint for
 * advances, so this surfaces only advances created through this app. */
export function useKnownAdvances(supplierId: string) {
  return useQuery({
    queryKey: ["suppliers", "known-advances", supplierId],
    queryFn: () => readKnownAdvances(supplierId),
    enabled: !!supplierId,
    staleTime: 0,
  });
}

export function useCreateDebtPayment() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplierId,
      body,
      idempotencyKey,
    }: {
      supplierId: string;
      body: CreateDebtPaymentInput;
      idempotencyKey: string;
    }) => suppliersApi.createDebtPayment(projectId!, supplierId, body, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", projectId] });
      queryClient.invalidateQueries({ queryKey: ["finance", projectId] });
      queryClient.invalidateQueries({ queryKey: ["purchases", projectId] });
    },
  });
}
