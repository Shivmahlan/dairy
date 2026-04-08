import { LedgerClient } from "@/features/dairy/components/ledger-client";
import { PageHeader } from "@/features/dairy/components/page-header";

export default function LedgerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settlement Ledger"
        title="Ledger"
        description="Review automated 10-day settlement cycles, track carry-forward balances, and lock completed periods so backtracking cannot happen."
      />
      <LedgerClient />
    </div>
  );
}
