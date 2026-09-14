import { apiFetch } from "@/lib/api/client";
import type {
  InventoryBalance,
  Material,
  MaterialCategory,
  Unit,
  Warehouse,
} from "@/lib/api/types";

export interface ListInventoryFilters {
  warehouseId?: string;
  materialId?: string;
  categoryId?: string;
  lowStock?: boolean;
  search?: string;
}

export interface ListMaterialsFilters {
  categoryId?: string;
  isActive?: boolean;
  search?: string;
}

export const inventoryApi = {
  listWarehouses: (projectId: string) =>
    apiFetch<Warehouse[]>(`/projects/${projectId}/warehouses`),

  getWarehouse: (projectId: string, id: string) =>
    apiFetch<Warehouse>(`/projects/${projectId}/warehouses/${id}`),

  createWarehouse: (projectId: string, body: { name: string; code: string; comment?: string }) =>
    apiFetch<Warehouse>(`/projects/${projectId}/warehouses`, { method: "POST", body }),

  updateWarehouse: (
    projectId: string,
    id: string,
    body: { name?: string; comment?: string; isActive?: boolean },
  ) =>
    apiFetch<Warehouse>(`/projects/${projectId}/warehouses/${id}`, {
      method: "PATCH",
      body,
    }),

  listMaterialCategories: (projectId: string) =>
    apiFetch<MaterialCategory[]>(`/projects/${projectId}/material-categories`),

  createMaterialCategory: (projectId: string, body: { name: string }) =>
    apiFetch<MaterialCategory>(`/projects/${projectId}/material-categories`, {
      method: "POST",
      body,
    }),

  updateMaterialCategory: (
    projectId: string,
    id: string,
    body: { name?: string; isActive?: boolean },
  ) =>
    apiFetch<MaterialCategory>(`/projects/${projectId}/material-categories/${id}`, {
      method: "PATCH",
      body,
    }),

  listUnits: (projectId: string) => apiFetch<Unit[]>(`/projects/${projectId}/units`),

  listMaterials: (projectId: string, filters: ListMaterialsFilters) =>
    apiFetch<Material[]>(`/projects/${projectId}/materials`, {
      query: filters as Record<string, string | boolean | undefined>,
    }),

  getMaterial: (projectId: string, id: string) =>
    apiFetch<Material>(`/projects/${projectId}/materials/${id}`),

  createMaterial: (
    projectId: string,
    body: {
      name: string;
      code: string;
      categoryId: string;
      unitId: string;
      minimumStock?: string;
    },
  ) => apiFetch<Material>(`/projects/${projectId}/materials`, { method: "POST", body }),

  updateMaterial: (
    projectId: string,
    id: string,
    body: {
      name?: string;
      categoryId?: string;
      minimumStock?: string | null;
      isActive?: boolean;
    },
  ) =>
    apiFetch<Material>(`/projects/${projectId}/materials/${id}`, {
      method: "PATCH",
      body,
    }),

  listBalances: (projectId: string, filters: ListInventoryFilters) =>
    apiFetch<InventoryBalance[]>(`/projects/${projectId}/inventory`, {
      query: filters as Record<string, string | boolean | undefined>,
    }),
};
