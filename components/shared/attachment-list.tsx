"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { useAttachments, useDeleteAttachment } from "@/lib/query/hooks/use-attachments";
import { attachmentsApi } from "@/lib/api/attachments";
import { saveBlob } from "@/lib/download";
import { getErrorMessage } from "@/lib/errors/map";
import { formatDateTime } from "@/lib/format/date";
import { useProject } from "@/lib/project/project-context";
import type { AttachmentTarget } from "@/lib/api/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function AttachmentList({
  target,
  targetId,
  canMutate,
}: {
  target: AttachmentTarget;
  targetId: string;
  canMutate: boolean;
}) {
  const { projectId } = useProject();
  const { data, isLoading, isError, error, refetch } = useAttachments(target, targetId);
  const deleteMutation = useDeleteAttachment();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-16 w-full rounded-lg" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data || data.data.length === 0) {
    return <EmptyState icon={FileText} title="Файлов пока нет" />;
  }

  const handleDownload = async (id: string, filename: string) => {
    setDownloadingId(id);
    try {
      const file = await attachmentsApi.download(projectId!, id, filename);
      saveBlob(file.blob, file.filename);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <DataList>
      {data.data.map((att) => (
        <DataListRow key={att.id}>
          {att.mimeType.startsWith("image/") ? (
            <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <FileText className="size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{att.originalFilename}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(att.sizeBytes)} · {formatDateTime(att.createdAt)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Скачать файл"
            disabled={downloadingId === att.id}
            onClick={() => handleDownload(att.id, att.originalFilename)}
          >
            <Download className="size-4" />
          </Button>
          {canMutate && att.status !== "LINKED" && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Удалить файл"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate(att.id, {
                  onError: (err) => toast.error(getErrorMessage(err)),
                })
              }
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </DataListRow>
      ))}
    </DataList>
  );
}
