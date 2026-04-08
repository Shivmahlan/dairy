"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import { SummaryCard } from "./summary-card";
import { fetchLedgerOverview } from "../lib/ledger";
import { formatAmount, formatLedgerStatus } from "../lib/formatting";
import type { LedgerOverviewData } from "../lib/types";

const toneStyles = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  red: "border-rose-200 bg-rose-50 text-rose-700",
  yellow: "border-amber-200 bg-amber-50 text-amber-700",
};

export function LedgerClient() {
  const supabase = useRef(createClient()).current;
  const [activeTab, setActiveTab] = useState<"cycles" | "balance">("cycles");
  const [overview, setOverview] = useState<LedgerOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadLedgerOverview() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchLedgerOverview(supabase);

        if (isActive) {
          setOverview(data);
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load ledger cycles.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadLedgerOverview();

    return () => {
      isActive = false;
    };
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-[2rem] border border-dashed border-border bg-white/70">
        <div className="flex items-center gap-3 text-sm text-muted">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading ledger overview...
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="rounded-[2rem] border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger">
        {error ?? "Unable to load ledger overview."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border/80 bg-white/80 p-3 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveTab("cycles")}
            className={
              activeTab === "cycles"
                ? "rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white"
                : "rounded-2xl px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-primary/6"
            }
          >
            Ledger Cycles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("balance")}
            className={
              activeTab === "balance"
                ? "rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white"
                : "rounded-2xl px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-primary/6"
            }
          >
            Balance Status
          </button>
        </div>
      </section>

      {activeTab === "cycles" ? (
        <section className="rounded-[2rem] border border-border/80 bg-white/80 p-6 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Ledger cycles</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Every month is split automatically into 1-10, 11-20, and 21-end
                settlement cycles.
              </p>
            </div>
            <p className="text-sm text-muted">
              {overview.cycles.length} {overview.cycles.length === 1 ? "cycle" : "cycles"}
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-muted">
                    <th className="px-4 py-3 font-medium">Cycle</th>
                    <th className="px-4 py-3 font-medium">Milk</th>
                    <th className="px-4 py-3 font-medium">Credit</th>
                    <th className="px-4 py-3 font-medium">Debit</th>
                    <th className="px-4 py-3 font-medium">Net Balance</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {overview.cycles.map((cycle) => (
                    <tr key={cycle.id}>
                      <td className="px-4 py-4">
                        <div className="font-medium text-foreground">{cycle.label}</div>
                        <div className="mt-1 text-xs text-muted">
                          Carry forward: {formatAmount(cycle.carry_forward)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-foreground">
                        {formatAmount(cycle.total_milk_amount)}
                      </td>
                      <td className="px-4 py-4 text-foreground">
                        {formatAmount(cycle.total_credit)}
                      </td>
                      <td className="px-4 py-4 text-foreground">
                        {formatAmount(cycle.total_debit)}
                      </td>
                      <td className="px-4 py-4 font-semibold text-foreground">
                        {formatAmount(cycle.net_balance)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            cycle.status === "closed"
                              ? "rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-strong"
                              : "rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-foreground"
                          }
                        >
                          {formatLedgerStatus(cycle.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/ledger/${cycle.id}`}
                          className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary-strong"
                        >
                          View
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          <section
            className={`rounded-[2rem] border p-6 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-8 ${toneStyles[overview.tone]}`}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.24em]">
              Balance Status
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              {overview.statusText}
            </h2>
            <p className="mt-3 text-sm leading-7">
              Current cycle final balance: {formatAmount(overview.totalOutstandingBalance)}
            </p>
            {overview.currentCycle ? (
              <p className="mt-2 text-sm leading-7">
                Active cycle: {overview.currentCycle.label}
              </p>
            ) : null}
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <SummaryCard
              title="Current Cycle Balance"
              value={formatAmount(overview.currentCycleBalance)}
              detail="This cycle only, without earlier carry-forward."
            />
            <SummaryCard
              title="Total Outstanding Balance"
              value={formatAmount(overview.totalOutstandingBalance)}
              detail="Carry-forward plus the current cycle balance."
              accent="primary"
            />
          </section>
        </div>
      )}
    </div>
  );
}
