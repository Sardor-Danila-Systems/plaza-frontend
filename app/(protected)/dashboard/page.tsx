"use client";

import Link from "next/link";
import { Wallet, Users, Warehouse, ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinanceBalance } from "@/lib/query/hooks/use-finance";
import { useInventoryBalances } from "@/lib/query/hooks/use-inventory";
import { formatMoney } from "@/lib/format/decimal";
import { useProject } from "@/lib/project/project-context";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";
import { QUICK_ACTIONS } from "@/lib/nav/config";

export default function DashboardPage() {
  const { project } = useProject();
  const { user } = useAuth();
  const { data: balance, isLoading: balanceLoading } = useFinanceBalance();
  const { data: lowStock, isLoading: lowStockLoading } = useInventoryBalances({ lowStock: true });
  const canMutate = canMutateProject(user?.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{project?.name}</h1>
        <p className="text-sm text-muted-foreground">Обзор проекта</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/finance">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Касса (сум)
              </CardTitle>
              <Wallet className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="text-2xl font-semibold tabular-nums">
                  {formatMoney(balance?.uzs, "UZS")}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/finance">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Касса (USD)
              </CardTitle>
              <Wallet className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <p className="text-2xl font-semibold tabular-nums">
                  {formatMoney(balance?.usd, "USD")}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/suppliers">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Поставщики
              </CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                Долги и авансы по поставщикам
                <ArrowRight className="size-3.5" />
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/warehouses">
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Низкий остаток
              </CardTitle>
              <Warehouse className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {lowStockLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="flex items-center gap-2 text-2xl font-semibold tabular-nums">
                  {lowStock?.length ?? 0}
                  {(lowStock?.length ?? 0) > 0 && (
                    <AlertTriangle className="size-4 text-warning" />
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {canMutate && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Быстрые действия</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted"
              >
                <action.icon className="size-5 text-primary" />
                <span className="text-sm font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
