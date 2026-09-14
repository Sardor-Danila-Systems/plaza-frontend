import { WarehouseDetailClient } from "./warehouse-detail-client";

export default async function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WarehouseDetailClient id={id} />;
}
