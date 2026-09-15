import { AttachmentList } from "@/components/shared/attachment-list";
import { AttachmentUploader } from "@/components/shared/attachment-uploader";
import type { AttachmentTarget } from "@/lib/api/types";

export function AttachmentSection({
  target,
  targetId,
  canMutate,
}: {
  target: AttachmentTarget;
  targetId: string;
  canMutate: boolean;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Документы</h2>
      {canMutate && <AttachmentUploader target={target} targetId={targetId} />}
      <AttachmentList target={target} targetId={targetId} canMutate={canMutate} />
    </div>
  );
}
