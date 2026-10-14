import { formatMoney } from "@/lib/format/decimal";
import type { Balance, CashAccount } from "@/lib/api/types";

/** One account's сум balance with its USD balance underneath. The project
 * holds both currencies in each account, so a сум-only figure would hide
 * half of the money. */
export function AccountBalanceValue({ balance, account }: { balance?: Balance; account?: CashAccount }) {
  const source = account ? balance?.byAccount.find((b) => b.account === account) : balance;
  return (
    <>
      {formatMoney(source?.uzs ?? "0", "UZS")}
      <span className="block text-sm font-medium text-muted-foreground">
        {formatMoney(source?.usd ?? "0", "USD")}
      </span>
    </>
  );
}
