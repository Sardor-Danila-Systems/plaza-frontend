import { SupplierDetailClient } from "./supplier-detail-client";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SupplierDetailClient id={id} />;
}
