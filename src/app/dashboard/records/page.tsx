import { PageHeader } from "@/features/dairy/components/page-header";
import { RecordsClient } from "@/features/dairy/components/records-client";

export default function RecordsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Records"
        description="Filter by date range, review combined transactions, manage credits or debits, and export the filtered result as CSV or PDF."
      />
      <RecordsClient />
    </div>
  );
}
