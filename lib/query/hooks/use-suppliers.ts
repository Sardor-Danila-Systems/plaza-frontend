import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  suppliersApi,
  type CreateSupplierInput,
  type ListSuppliersFilters,
  type UpdateSupplierInput,
  type CreateSupplierAdvanceInput,
  type CreateDebtPaymentInput,
} from "@/lib/api/suppliers";
import { qk } from "@/lib/query/keys";
import type { Supplier } from "@/lib/api/types";
import { useProject } from "@/lib/project/project-context";

export function useSuppliers(filters: ListSuppliersFilters = {}) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.suppliers.list(projectId!, filters),
    queryFn: () => suppliersApi.list(projectId!, filters),
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
    onSuccess: (supplier) => {
      // Put the new row into every cached list (they are keyed by filter)
      // *before* the refetch lands. A
      // caller that selects it straight away (the purchase form's inline
      // "+") would otherwise hold an id no <SelectItem> matches yet, and a
      // Radix Select in that state keeps showing its placeholder even once
      // the option appears.
      queryClient.setQueriesData<Supplier[]>(
        { queryKey: ["suppliers", projectId, "list"] },
        (current) => (current ? [...current, supplier] : [supplier]),
      );
      queryClient.invalidateQueries({ queryKey: ["suppliers", projectId] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", projectId] });
      queryClient.invalidateQueries({ queryKey: ["finance", projectId] });
    },
  });
}

/** Every advance the supplier has, server-side — replaces the browser-local
 * list that could only ever show advances created in that same browser. */
export function useSupplierAdvances(supplierId: string) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.suppliers.advances(projectId!, supplierId),
    queryFn: () => suppliersApi.listAdvances(projectId!, supplierId),
    enabled: !!projectId && !!supplierId,
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
