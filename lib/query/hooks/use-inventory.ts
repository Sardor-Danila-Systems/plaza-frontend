import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inventoryApi,
  type ListInventoryFilters,
  type ListMaterialsFilters,
} from "@/lib/api/inventory";
import { qk } from "@/lib/query/keys";
import { useProject } from "@/lib/project/project-context";

export function useWarehouses() {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.inventory.warehouses(projectId!),
    queryFn: () => inventoryApi.listWarehouses(projectId!),
    enabled: !!projectId,
  });
}

export function useWarehouse(id: string) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.inventory.warehouseDetail(projectId!, id),
    queryFn: () => inventoryApi.getWarehouse(projectId!, id),
    enabled: !!projectId && !!id,
  });
}

export function useCreateWarehouse() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; code: string; comment?: string }) =>
      inventoryApi.createWarehouse(projectId!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory", projectId] }),
  });
}

export function useUpdateWarehouse() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { name?: string; comment?: string; isActive?: boolean };
    }) => inventoryApi.updateWarehouse(projectId!, id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory", projectId] }),
  });
}

export function useMaterialCategories() {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.inventory.materialCategories(projectId!),
    queryFn: () => inventoryApi.listMaterialCategories(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateMaterialCategory() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string }) => inventoryApi.createMaterialCategory(projectId!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory", projectId] }),
  });
}

export function useUnits() {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.inventory.units(projectId!),
    queryFn: () => inventoryApi.listUnits(projectId!),
    enabled: !!projectId,
  });
}

export function useMaterials(filters: ListMaterialsFilters = {}) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.inventory.materials(projectId!, filters),
    queryFn: () => inventoryApi.listMaterials(projectId!, filters),
    enabled: !!projectId,
  });
}

export function useCreateMaterial() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      code: string;
      categoryId: string;
      unitId: string;
      minimumStock?: string;
    }) => inventoryApi.createMaterial(projectId!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory", projectId] }),
  });
}

export function useUpdateMaterial() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { name?: string; categoryId?: string; minimumStock?: string | null; isActive?: boolean };
    }) => inventoryApi.updateMaterial(projectId!, id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventory", projectId] }),
  });
}

export function useInventoryBalances(filters: ListInventoryFilters = {}) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.inventory.balances(projectId!, filters),
    queryFn: () => inventoryApi.listBalances(projectId!, filters),
    enabled: !!projectId,
  });
}
