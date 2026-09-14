import { PurchaseDetailClient } from "./purchase-detail-client";

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PurchaseDetailClient id={id} />;
}
