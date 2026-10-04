"use client";

import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CASH_ACCOUNTS, CASH_ACCOUNT_LABELS, type CashAccount } from "@/lib/api/types";

/** "Наличные | Банковский счёт" — which of the project's two cash accounts
 * an operation moves money through. A segmented control rather than a
 * select: there are exactly two choices and both should be visible at a
 * glance, since picking the wrong one is what produces a phantom
 * "insufficient cash" on an account that simply wasn't the intended one. */
export function CashAccountPicker({
  value,
  onChange,
  label = "Касса",
  id = "cash-account",
}: {
  value: CashAccount;
  onChange: (account: CashAccount) => void;
  label?: string;
  id?: string;
}) {
  return (
    <div className="space-y-2">
      <Label id={`${id}-label`}>{label}</Label>
      <Tabs value={value} onValueChange={(v) => onChange(v as CashAccount)}>
        <TabsList className="grid w-full grid-cols-2" aria-labelledby={`${id}-label`}>
          {CASH_ACCOUNTS.map((acc) => (
            <TabsTrigger key={acc} value={acc}>
              {CASH_ACCOUNT_LABELS[acc]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
