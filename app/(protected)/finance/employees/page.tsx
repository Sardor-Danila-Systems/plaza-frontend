"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useAuth } from "@/lib/auth/auth-provider";
import { canPostCash } from "@/lib/auth/permissions";
import { getErrorMessage } from "@/lib/errors/map";
import { formatMoney } from "@/lib/format/decimal";
import { useCreateEmployee, useEmployees } from "@/lib/query/hooks/use-employees";

export default function EmployeesPage() {
  const { user } = useAuth();
  const canMutate = canPostCash(user?.role);
  const { data, isLoading, isError, error, refetch } = useEmployees();
  const create = useCreateEmployee();
  const [name, setName] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(name.trim(), {
      onSuccess: () => {
        setName("");
        toast.success("Сотрудник добавлен");
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Сотрудники" subtitle="Авансы по зарплате и их остаток" />

      {canMutate && (
        <form onSubmit={add} className="flex gap-2">
          <Input
            className="h-10"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ФИО нового сотрудника"
            aria-label="ФИО нового сотрудника"
          />
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            Добавить
          </Button>
        </form>
      )}

      {isLoading && <Skeleton className="h-48 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState icon={Users} title="Сотрудников пока нет" description="Добавьте первого — к нему привязываются авансы и зарплата" />
      )}
      {data && data.length > 0 && (
        <DataList>
          {data.map((e) => (
            <Link key={e.id} href={`/finance/employees/${e.id}`}>
              <DataListRow>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {e.name}
                    {!e.isActive ? " · не работает" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.balances.some((b) => Number(b.outstanding) > 0)
                      ? e.balances
                          .filter((b) => Number(b.outstanding) > 0)
                          .map((b) => `аванс не удержан ${formatMoney(b.outstanding, b.currency)}`)
                          .join(" · ")
                      : "авансов к удержанию нет"}
                  </p>
                </div>
              </DataListRow>
            </Link>
          ))}
        </DataList>
      )}
    </div>
  );
}
