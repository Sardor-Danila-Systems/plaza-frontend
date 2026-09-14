import { FinanceDetailClient } from "./finance-detail-client";

export default async function FinanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FinanceDetailClient id={id} />;
}
