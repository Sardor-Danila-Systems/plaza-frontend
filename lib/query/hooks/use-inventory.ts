import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inventoryApi,
  type ListInventoryFilters,
  type ListMaterialsFilters,
} from "@/lib/api/inventory";
import { qk } from "@/lib/query/keys";
import type { Material, Warehouse } from "@/lib/api/types";
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
    onSuccess: (warehouse) => {
      // See useCreateSupplier — the new row has to be selectable before the
      // refetch lands, or an inline "create and use it" flow selects an id
      // that no option matches yet.
      queryClient.setQueryData<Warehouse[]>(qk.inventory.warehouses(projectId!), (current) =>
        current ? [...current, warehouse] : [warehouse],
      );
      queryClient.invalidateQueries({ queryKey: ["inventory", projectId] });
    },
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
    onSuccess: (material) => {
      // Every cached materials list (they are keyed by filter) gets the new
      // row appended — see useCreateSupplier. A list whose filter the new
      // material doesn't actually match self-corrects on the refetch below.
      queryClient.setQueriesData<Material[]>(
        { queryKey: ["inventory", projectId, "materials"] },
        (current) => (current ? [...current, material] : [material]),
      );
      queryClient.invalidateQueries({ queryKey: ["inventory", projectId] });
    },
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
