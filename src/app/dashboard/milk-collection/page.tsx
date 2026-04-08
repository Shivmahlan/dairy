import { MilkCollectionClient } from "@/features/dairy/components/milk-collection-client";
import { PageHeader } from "@/features/dairy/components/page-header";

export default function MilkCollectionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Daily Collection"
        title="Milk Collection"
        description="Record milk weight and fat, review the live total, and keep today's collection visible below the form."
      />
      <MilkCollectionClient />
    </div>
  );
}
