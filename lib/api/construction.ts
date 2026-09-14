import { apiFetch } from "@/lib/api/client";
import type { BuildingBlock, Floor } from "@/lib/api/types";

export const constructionApi = {
  listBlocks: (projectId: string) =>
    apiFetch<BuildingBlock[]>(`/projects/${projectId}/construction/blocks`),

  createBlock: (projectId: string, body: { name: string; code: string }) =>
    apiFetch<BuildingBlock>(`/projects/${projectId}/construction/blocks`, {
      method: "POST",
      body,
    }),

  updateBlock: (
    projectId: string,
    blockId: string,
    body: { name?: string; isActive?: boolean },
  ) =>
    apiFetch<BuildingBlock>(`/projects/${projectId}/construction/blocks/${blockId}`, {
      method: "PATCH",
      body,
    }),

  listFloors: (projectId: string, blockId: string) =>
    apiFetch<Floor[]>(`/projects/${projectId}/construction/blocks/${blockId}/floors`),

  createFloor: (
    projectId: string,
    blockId: string,
    body: { label: string; sortOrder: number },
  ) =>
    apiFetch<Floor>(`/projects/${projectId}/construction/blocks/${blockId}/floors`, {
      method: "POST",
      body,
    }),

  updateFloor: (
    projectId: string,
    blockId: string,
    floorId: string,
    body: { label?: string; sortOrder?: number; isActive?: boolean },
  ) =>
    apiFetch<Floor>(
      `/projects/${projectId}/construction/blocks/${blockId}/floors/${floorId}`,
      { method: "PATCH", body },
    ),
};
