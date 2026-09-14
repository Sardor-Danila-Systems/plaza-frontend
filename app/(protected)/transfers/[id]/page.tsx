import { TransferDetailClient } from "./transfer-detail-client";

export default async function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransferDetailClient id={id} />;
}
