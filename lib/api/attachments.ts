import { apiFetch, apiFetchBlob, apiUploadFile, type DownloadedFile } from "@/lib/api/client";
import type { Attachment, AttachmentTarget, Paginated } from "@/lib/api/types";

export const attachmentsApi = {
  /** One-shot multipart upload; field name is `file`. Returns a READY (or
   * FAILED) attachment — not yet linked to anything. */
  upload: (projectId: string, file: File, onProgress?: (fraction: number) => void) =>
    apiUploadFile(`/projects/${projectId}/attachments`, file, onProgress) as Promise<Attachment>,

  link: (projectId: string, attachmentId: string, target: AttachmentTarget, targetId: string) =>
    apiFetch<Attachment>(`/projects/${projectId}/attachments/${attachmentId}/link`, {
      method: "POST",
      body: { target, targetId },
    }),

  list: (projectId: string, target: AttachmentTarget, targetId: string) =>
    apiFetch<Paginated<Attachment>>(`/projects/${projectId}/attachments`, {
      query: { target, targetId, pageSize: 50 },
    }),

  download: (projectId: string, attachmentId: string, fallbackFilename: string): Promise<DownloadedFile> =>
    apiFetchBlob(`/projects/${projectId}/attachments/${attachmentId}/download`, { fallbackFilename }),

  remove: (projectId: string, attachmentId: string) =>
    apiFetch<void>(`/projects/${projectId}/attachments/${attachmentId}`, { method: "DELETE" }),
};
