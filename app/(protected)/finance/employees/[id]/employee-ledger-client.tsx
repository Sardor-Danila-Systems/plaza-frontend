"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/lib/auth/auth-provider";
import { canPostCash } from "@/lib/auth/permissions";
import { reportsApi } from "@/lib/api/reports";
import { saveBlob } from "@/lib/download";
import { getErrorMessage } from "@/lib/errors/map";
import { formatBusinessDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/decimal";
import { useProject } from "@/lib/project/project-context";
import { useEmployeeLedger } from "@/lib/query/hooks/use-employees";
import { CASH_ACCOUNT_LABELS } from "@/lib/api/types";

export function EmployeeLedgerClient({ id }: { id: string }) {
  const { user } = useAuth();
  const canMutate = canPostCash(user?.role);
  const { projectId } = useProject();
  const { data, isLoading, isError, error, refetch } = useEmployeeLedger(id);
  const [pending, setPending] = useState(false);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (isError || !data) return <ErrorState error={error} onRetry={() => refetch()} />;

  const download = async () => {
    setPending(true);
    try {
      const file = await reportsApi.downloadForm(projectId!, "employee-ledger", { employeeId: id });
      saveBlob(file.blob, file.filename);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const { employee, entries } = data;
  const advanceHref = `/finance/new?type=SALARY&advance=1`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={employee.name}
        subtitle="Авансы, зарплата и удержания"
        actions={
          <>
            <Button size="sm" variant="outline" disabled={pending} onClick={download}>
              <FileSpreadsheet className="size-4" />
              {pending ? "…" : "Excel"}
            </Button>
            {canMutate && (
              <Button size="sm" asChild>
                <Link href={advanceHref}>Аванс</Link>
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="space-y-1 pt-6 text-sm">
          {employee.balances.length === 0 && <p className="text-muted-foreground">Авансов не выдавалось</p>}
          {employee.balances.map((b) => (
            <div key={b.currency} className="flex justify-between">
              <span className="text-muted-foreground">Остаток авансов к удержанию</span>
              <span className="font-medium tabular-nums">{formatMoney(b.outstanding, b.currency)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <DataList>
        {entries.map((e) => (
          <Link key={e.id} href={`/finance/${e.id}`}>
            <DataListRow>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {e.kind === "ADVANCE" ? "Аванс" : "Выплата зарплаты"}
                  {e.cancelled ? " · отменено" : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatBusinessDate(e.occurredAt)} · {CASH_ACCOUNT_LABELS[e.account]}
                  {e.kind === "PAYOUT" && e.accruedAmount
                    ? ` · начислено ${formatMoney(e.accruedAmount, e.currency)}, удержано ${formatMoney(
                        (Number(e.accruedAmount) - Number(e.amount)).toFixed(2),
                        e.currency,
                      )}`
                    : ""}
                </p>
              </div>
              <span className="font-medium tabular-nums">{formatMoney(e.amount, e.currency)}</span>
            </DataListRow>
          </Link>
        ))}
      </DataList>
    </div>
  );
}
