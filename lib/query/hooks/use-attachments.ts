import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attachmentsApi } from "@/lib/api/attachments";
import { qk } from "@/lib/query/keys";
import { useProject } from "@/lib/project/project-context";
import type { AttachmentTarget } from "@/lib/api/types";

export function useAttachments(target: AttachmentTarget, targetId: string) {
  const { projectId } = useProject();
  return useQuery({
    queryKey: qk.attachments.list(projectId!, target, targetId),
    queryFn: () => attachmentsApi.list(projectId!, target, targetId),
    enabled: !!projectId && !!targetId,
  });
}

/** Upload + link as one call from the caller's perspective — the backend
 * requires them as two separate requests (upload returns a READY attachment
 * with nothing linked yet; link is a distinct required second step). */
export function useUploadAttachment() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      target,
      targetId,
      onProgress,
    }: {
      file: File;
      target: AttachmentTarget;
      targetId: string;
      onProgress?: (fraction: number) => void;
    }) => {
      const uploaded = await attachmentsApi.upload(projectId!, file, onProgress);
      return attachmentsApi.link(projectId!, uploaded.id, target, targetId);
    },
    onSuccess: (_data, { target, targetId }) => {
      queryClient.invalidateQueries({ queryKey: qk.attachments.list(projectId!, target, targetId) });
      queryClient.invalidateQueries({ queryKey: ["audit", projectId] });
    },
  });
}

export function useDeleteAttachment() {
  const { projectId } = useProject();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => attachmentsApi.remove(projectId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", projectId] });
      queryClient.invalidateQueries({ queryKey: ["audit", projectId] });
    },
  });
}
