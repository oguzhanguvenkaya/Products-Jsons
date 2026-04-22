import { PagePlaceholder } from "@/components/shell/placeholder";

type PageProps = {
  params: Promise<{ sku: string }>;
};

export default async function ProductDetail({ params }: PageProps) {
  const { sku } = await params;
  return (
    <PagePlaceholder title={`Ürün: ${sku}`} phase="Phase 4.9.3">
      6 sekmeli ürün editörü (Info · Specs · Sizes · FAQ · Relations · History).
      Read-only iskelet 4.9.3'te, inline edit + SpecEditor + VariantEditor 4.9.5'te etkinleşecek.
    </PagePlaceholder>
  );
}
