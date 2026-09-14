import { WriteOffDetailClient } from "./write-off-detail-client";

export default async function WriteOffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WriteOffDetailClient id={id} />;
}
