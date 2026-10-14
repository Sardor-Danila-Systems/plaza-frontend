"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportsApi } from "@/lib/api/reports";
import { saveBlob } from "@/lib/download";
import { getErrorMessage } from "@/lib/errors/map";
import { useProject } from "@/lib/project/project-context";
import type { CashAccount } from "@/lib/api/types";

/** Downloads the «Общий кассовый журнал» from Касса itself, so a cashier —
 * who has no Отчёты section — can still get it. Covers 1 January to today
 * for the account currently filtered on. */
export function CashJournalButton({ account }: { account?: CashAccount }) {
  const { projectId } = useProject();
  const [pending, setPending] = useState(false);

  const download = async () => {
    if (!projectId) return;
    setPending(true);
    try {
      const file = await reportsApi.downloadForm(projectId, "cash-journal", { account });
      saveBlob(file.blob, file.filename);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Button size="sm" variant="outline" disabled={pending || !projectId} onClick={download}>
      <FileSpreadsheet className="size-4" />
      {pending ? "…" : "Журнал"}
    </Button>
  );
}
