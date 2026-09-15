"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadAttachment } from "@/lib/query/hooks/use-attachments";
import { getErrorMessage } from "@/lib/errors/map";
import type { AttachmentTarget } from "@/lib/api/types";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function AttachmentUploader({ target, targetId }: { target: AttachmentTarget; targetId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadAttachment();
  const [progress, setProgress] = useState<number | null>(null);

  const handleFile = (file: File) => {
    // Fast client-side feedback only — the server re-validates by content,
    // not by trusting this (see attachments.service.ts's file-type sniff).
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Поддерживаются только файлы JPEG, PNG, WebP и PDF.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Файл слишком большой (максимум 10 МБ).");
      return;
    }

    setProgress(0);
    uploadMutation.mutate(
      { file, target, targetId, onProgress: setProgress },
      {
        onSuccess: () => {
          toast.success("Файл прикреплён");
          setProgress(null);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
          setProgress(null);
        },
      },
    );
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={progress !== null}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="size-3.5" />
        {progress !== null ? "Загрузка…" : "Прикрепить файл"}
      </Button>
      {progress !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
