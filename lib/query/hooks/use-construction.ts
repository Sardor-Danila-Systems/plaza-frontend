import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { constructionApi } from "@/lib/api/construction";
import { qk } from "@/lib/query/keys";
import { useProject } from "@/lib/project/project-context";

export function useBlocks() {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.construction.blocks(projectId!),
    queryFn: () => constructionApi.listBlocks(projectId!),
    enabled: !!projectId,
  });
}

export function useFloors(blockId: string | null) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.construction.floors(projectId!, blockId ?? ""),
    queryFn: () => constructionApi.listFloors(projectId!, blockId!),
    enabled: !!projectId && !!blockId,
  });
}

export function useCreateBlock() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; code: string }) => constructionApi.createBlock(projectId!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["construction", projectId] }),
  });
}

export function useCreateBlocksBulk() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { blocks: { name: string; code: string; floorLabels?: string[] }[] }) =>
      constructionApi.createBlocksBulk(projectId!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["construction", projectId] }),
  });
}

export function useCreateFloorsBulk() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      blockId,
      body,
    }: {
      blockId: string;
      body: { labels: string[]; startSortOrder?: number };
    }) => constructionApi.createFloorsBulk(projectId!, blockId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["construction", projectId] }),
  });
}

export function useCreateFloor() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ blockId, body }: { blockId: string; body: { label: string; sortOrder: number } }) =>
      constructionApi.createFloor(projectId!, blockId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["construction", projectId] }),
  });
}
