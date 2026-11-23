"use client";

import { useMemo, useState } from "react";
import Decimal from "decimal.js";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateFinanceTransaction, useFinanceCategories } from "@/lib/query/hooks/use-finance";
import { useCreateEmployee, useEmployees, useOpenAdvances } from "@/lib/query/hooks/use-employees";
import { formatMoney } from "@/lib/format/decimal";
import { formatBusinessDate } from "@/lib/format/date";
import { CurrencySelect, RateFields, useRateForm } from "@/components/shared/currency-rate-fields";
import { CashAccountPicker } from "@/components/shared/cash-account-picker";
import { useIdempotencyKey } from "@/lib/idempotency";
import { getErrorMessage } from "@/lib/errors/map";
import { todayBusinessDate } from "@/lib/format/date";
import { isPositiveDecimalString } from "@/lib/format/decimal";
import type { CashAccount, CreatableTransactionType, Currency } from "@/lib/api/types";

const TYPE_LABELS: Record<CreatableTransactionType, string> = {
  INCOME: "Приход",
  EXPENSE: "Расход",
  SALARY: "Зарплата",
};

export default function NewFinanceTransactionPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The URL's `type` param is the single source of truth — not a useState
  // seeded from it once. A useState initial value only runs on mount, so a
  // client-side navigation from the quick-action FAB (e.g. Приход -> Расход)
  // that reuses this already-mounted route/component never re-read it,
  // leaving the form stuck on whichever type was open first. Deriving it
  // fresh every render fixes that regardless of whether the component
  // remounts, and switching tabs below writes back to the URL so it stays
  // authoritative in both directions.
  const type = (searchParams.get("type") as CreatableTransactionType | null) ?? "INCOME";

  const setType = (next: CreatableTransactionType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">Новая операция</h1>
      </div>

      <Tabs value={type} onValueChange={(v) => setType(v as CreatableTransactionType)}>
        <TabsList className="grid w-full grid-cols-3">
          {(Object.keys(TYPE_LABELS) as CreatableTransactionType[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {TYPE_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* `key={type}` remounts the form fresh on every type switch (FAB or
       * tab click) — React's own recommended way to reset a subtree's state
       * when a value changes, instead of an effect that resets each field
       * by hand. A type switch is logically a new entry: nothing about a
       * half-typed EXPENSE should carry over into a freshly opened SALARY
       * form. */}
      <FinanceForm key={type} type={type} router={router} />
    </div>
  );
}

function FinanceForm({
  type,
  router,
}: {
  type: CreatableTransactionType;
  router: ReturnType<typeof useRouter>;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("UZS");
  const rate = useRateForm();
  const [account, setAccount] = useState<CashAccount>("CASH");
  const [categoryId, setCategoryId] = useState("");
  const [party, setParty] = useState("");
  const searchParams = useSearchParams();
  const [isAdvance, setIsAdvance] = useState(searchParams.get("advance") === "1");
  const [employeeId, setEmployeeId] = useState("");
  const [newEmployee, setNewEmployee] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});

  const { data: employees = [] } = useEmployees();
  const createEmployee = useCreateEmployee();
  const { data: openAdvances = [] } = useOpenAdvances(type === "SALARY" ? employeeId : "");
  const isPayout = type === "SALARY" && !isAdvance;

  // Advances in the payout currency, oldest first. By default every unspent
  // advance is withheld, but never more than the accrued salary; the
  // cashier can lower any amount or untick an advance.
  const deductionPlan = useMemo(() => {
    if (!isPayout) return [];
    let left = new Decimal(isPositiveDecimalString(amount) ? amount : 0);
    return openAdvances
      .filter((a) => a.currency === currency)
      .map((a) => {
        const remaining = new Decimal(a.remaining);
        let value: Decimal;
        if (skipped[a.id]) value = new Decimal(0);
        else if (edits[a.id] !== undefined) value = new Decimal(edits[a.id] || 0);
        else value = Decimal.min(remaining, left);
        if (!skipped[a.id] && edits[a.id] === undefined) left = left.minus(value);
        return { advance: a, remaining, value };
      });
  }, [isPayout, openAdvances, currency, amount, edits, skipped]);
  const deducted = deductionPlan.reduce((s, r) => s.plus(r.value), new Decimal(0));
  const accrued = new Decimal(isPositiveDecimalString(amount) ? amount : 0);
  const toPay = accrued.minus(deducted);
  const [comment, setComment] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayBusinessDate());
  const [formError, setFormError] = useState<string | null>(null);

  const { data: categories = [] } = useFinanceCategories();
  const createMutation = useCreateFinanceTransaction();
  const { key, renew } = useIdempotencyKey();

  const relevantCategories = categories.filter((c) => c.kind === type && c.isActive);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isPositiveDecimalString(amount)) {
      setFormError("Введите корректную сумму");
      return;
    }

    const rateError = rate.validate(currency);
    if (rateError) {
      setFormError(rateError);
      return;
    }

    if (type === "SALARY" && !employeeId) {
      setFormError("Выберите сотрудника");
      return;
    }
    const deductions = isPayout
      ? deductionPlan
          .filter((r) => r.value.gt(0))
          .map((r) => ({ advanceId: r.advance.id, amount: r.value.toFixed(2) }))
      : [];
    if (isPayout) {
      if (deductionPlan.some((r) => r.value.gt(r.remaining) || r.value.isNegative())) {
        setFormError("Удержание больше остатка аванса");
        return;
      }
      if (toPay.isNegative()) {
        setFormError("Удержано авансов больше, чем начислено");
        return;
      }
    }

    createMutation.mutate(
      {
        body: {
          type,
          amount: isPayout && deductions.length > 0 ? toPay.toFixed(2) : amount,
          ...(isPayout && deductions.length > 0
            ? { accruedAmount: accrued.toFixed(2), deductions }
            : {}),
          employeeId: type === "SALARY" ? employeeId : undefined,
          currency,
          ...rate.body(currency),
          account,
          categoryId: categoryId || undefined,
          source: type === "INCOME" ? party || undefined : undefined,
          recipient: type === "EXPENSE" ? party || undefined : undefined,
          isAdvance: type === "SALARY" && isAdvance ? true : undefined,
          comment: comment.trim() || undefined,
          occurredAt,
        },
        idempotencyKey: key,
      },
      {
        onSuccess: (tx) => {
          renew();
          toast.success("Операция сохранена");
          router.replace(`/finance/${tx.id}`);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {formError && <p className="text-sm text-destructive">{formError}</p>}

      {type === "SALARY" && (
        <div className="space-y-2">
          <Label id="salary-kind-label">Вид выплаты</Label>
          <div
            role="radiogroup"
            aria-labelledby="salary-kind-label"
            className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
          >
            {[
              { value: false, label: "Зарплата" },
              { value: true, label: "Аванс" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={isAdvance === o.value}
                onClick={() => setIsAdvance(o.value)}
                className={`h-10 rounded-md text-sm font-medium transition-colors ${
                  isAdvance === o.value ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="amount">{isPayout ? "Начислено" : "Сумма"}</Label>
        <div className="flex gap-2">
          <DecimalInput
            id="amount"
            scale={2}
            className="h-11 flex-1"
            value={amount}
            onValueChange={setAmount}
            placeholder="0.00"
          />
          <CurrencySelect value={currency} onChange={setCurrency} />
        </div>
      </div>

      {currency === "USD" && <RateFields form={rate} />}

      <CashAccountPicker
        value={account}
        onChange={setAccount}
        label={type === "INCOME" ? "Куда поступили деньги" : "Откуда оплачено"}
      />

      {relevantCategories.length > 0 && (
        <div className="space-y-2">
          <Label id="finance-category-label">Категория</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-11 w-full" aria-labelledby="finance-category-label">
              <SelectValue placeholder="Без категории" />
            </SelectTrigger>
            <SelectContent>
              {relevantCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {type === "SALARY" && (
        <div className="space-y-2">
          <Label id="employee-label">Сотрудник</Label>
          <Select
            value={employeeId}
            onValueChange={(v) => {
              setEmployeeId(v);
              setEdits({});
              setSkipped({});
            }}
          >
            <SelectTrigger className="h-11 w-full" aria-labelledby="employee-label">
              <SelectValue placeholder="Выберите сотрудника" />
            </SelectTrigger>
            <SelectContent>
              {employees
                .filter((e) => e.isActive)
                .map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              className="h-10"
              value={newEmployee}
              onChange={(e) => setNewEmployee(e.target.value)}
              placeholder="Нового сотрудника: ФИО"
              aria-label="ФИО нового сотрудника"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!newEmployee.trim() || createEmployee.isPending}
              onClick={() =>
                createEmployee.mutate(newEmployee.trim(), {
                  onSuccess: (e) => {
                    setEmployeeId(e.id);
                    setNewEmployee("");
                    toast.success("Сотрудник добавлен");
                  },
                  onError: (err) => toast.error(getErrorMessage(err)),
                })
              }
            >
              Добавить
            </Button>
          </div>
        </div>
      )}

      {isPayout && employeeId && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Авансы к удержанию</p>
          {deductionPlan.length === 0 && (
            <p className="text-sm text-muted-foreground">Неудержанных авансов в этой валюте нет</p>
          )}
          {deductionPlan.map((r) => (
            <div key={r.advance.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4"
                aria-label={`Удержать аванс от ${formatBusinessDate(r.advance.occurredAt)}`}
                checked={!skipped[r.advance.id]}
                onChange={(e) => setSkipped((s) => ({ ...s, [r.advance.id]: !e.target.checked }))}
              />
              <div className="min-w-0 flex-1 text-sm">
                <p>{formatBusinessDate(r.advance.occurredAt)}</p>
                <p className="text-xs text-muted-foreground">
                  остаток {formatMoney(r.advance.remaining, r.advance.currency)}
                </p>
              </div>
              <DecimalInput
                scale={2}
                className="h-9 w-36"
                disabled={skipped[r.advance.id]}
                value={skipped[r.advance.id] ? "0" : r.value.toFixed(2)}
                onValueChange={(v) => setEdits((s) => ({ ...s, [r.advance.id]: v }))}
              />
            </div>
          ))}
          <dl className="grid grid-cols-2 gap-y-1 border-t pt-2 text-sm">
            <dt className="text-muted-foreground">Начислено</dt>
            <dd className="text-right tabular-nums">{formatMoney(accrued.toFixed(2), currency)}</dd>
            <dt className="text-muted-foreground">Удержано авансов</dt>
            <dd className="text-right tabular-nums">{formatMoney(deducted.toFixed(2), currency)}</dd>
            <dt className="font-medium">К выдаче</dt>
            <dd className="text-right font-medium tabular-nums">
              {formatMoney(toPay.isNegative() ? "0" : toPay.toFixed(2), currency)}
            </dd>
          </dl>
        </div>
      )}

      {type !== "SALARY" && (
      <div className="space-y-2">
        <Label htmlFor="party">{type === "INCOME" ? "Источник" : "Получатель"}</Label>
        <Input
          id="party"
          className="h-11"
          value={party}
          onChange={(e) => setParty(e.target.value)}
          placeholder={type === "INCOME" ? "Например, взнос учредителя" : "Например, ФИО или организация"}
        />
      </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="occurredAt">Дата</Label>
        <Input
          id="occurredAt"
          type="date"
          className="h-11"
          value={occurredAt}
          max={todayBusinessDate()}
          onChange={(e) => setOccurredAt(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment">Комментарий</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
        />
      </div>

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-0 md:py-0">
        <Button type="submit" className="h-11 w-full" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>
    </form>
  );
}
