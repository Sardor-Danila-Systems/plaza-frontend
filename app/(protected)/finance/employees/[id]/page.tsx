import { EmployeeLedgerClient } from "./employee-ledger-client";

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeeLedgerClient id={id} />;
}
