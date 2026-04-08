import { LedgerCycleDetailClient } from "@/features/dairy/components/ledger-cycle-detail-client";
import { PageHeader } from "@/features/dairy/components/page-header";

interface LedgerCycleDetailPageProps {
  params: Promise<{
    cycleId: string;
  }>;
}

export default async function LedgerCycleDetailPage({
  params,
}: LedgerCycleDetailPageProps) {
  const { cycleId } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cycle Breakdown"
        title="Ledger Cycle Detail"
        description="Inspect the full cycle breakdown, export the statement as PDF, and close the cycle once settlement is complete."
      />
      <LedgerCycleDetailClient cycleId={cycleId} />
    </div>
  );
}
