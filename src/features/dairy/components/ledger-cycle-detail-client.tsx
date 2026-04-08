"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FileText, LoaderCircle, Lock } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import { AlertBanner } from "./alert-banner";
import { useBusinessContext } from "./business-context-provider";
import { SummaryCard } from "./summary-card";
import { exportLedgerCycleToPdf } from "../lib/export";
import {
  closeLedgerCycle,
  fetchLedgerCycleDetail,
} from "../lib/ledger";
import {
  buildItemTransactionNote,
  formatAmount,
  formatLedgerStatus,
  formatShiftLabel,
  formatTransactionType,
} from "../lib/formatting";
import type { AlertState, LedgerCycleDetailData } from "../lib/types";

interface LedgerCycleDetailClientProps {
  cycleId: string;
}

export function LedgerCycleDetailClient({
  cycleId,
}: LedgerCycleDetailClientProps) {
  const supabase = useRef(createClient()).current;
  const { businessId } = useBusinessContext();
  const [detail, setDetail] = useState<LedgerCycleDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadCycleDetail() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchLedgerCycleDetail(supabase, businessId, cycleId);

        if (isActive) {
          setDetail(data);
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load ledger cycle detail.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadCycleDetail();

    return () => {
      isActive = false;
    };
  }, [businessId, cycleId, supabase]);

  async function handleCloseCycle() {
    setAlert(null);
    setIsClosing(true);

    try {
      const updatedDetail = await closeLedgerCycle(supabase, businessId, cycleId);
      setDetail(updatedDetail);
      setAlert({
        tone: "success",
        message: "Cycle closed successfully. Past data for this period is now locked.",
      });
    } catch (closeError) {
      setAlert({
        tone: "error",
        message:
          closeError instanceof Error
            ? closeError.message
            : "Unable to close this cycle.",
      });
    } finally {
      setIsClosing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-[2rem] border border-dashed border-border bg-white/70">
        <div className="flex items-center gap-3 text-sm text-muted">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading cycle details...
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-[2rem] border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger">
        {error ?? "Unable to load ledger cycle detail."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border/80 bg-white/80 p-6 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Link
              href="/dashboard/ledger"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary-strong"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to ledger
            </Link>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-primary/75">
              Cycle Detail
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {detail.cycle.label}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              Review milk earnings, item transactions, payments, carry-forward, and
              the final cycle balance before settlement.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => exportLedgerCycleToPdf(detail)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/6"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleCloseCycle}
              disabled={
                isClosing ||
                detail.cycle.status === "closed" ||
                !detail.cycle.can_close
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Lock className="h-4 w-4" />
              {detail.cycle.status === "closed"
                ? "Cycle closed"
                : isClosing
                  ? "Closing cycle..."
                  : "Close cycle"}
            </button>
          </div>
        </div>

        <div className="mt-5 inline-flex rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground">
          {formatLedgerStatus(detail.cycle.status)}
        </div>

        {detail.cycle.status === "open" && !detail.cycle.can_close ? (
          <p className="mt-4 text-sm leading-6 text-muted">
            This cycle can be closed only after its end date has passed and all
            earlier cycles are already closed.
          </p>
        ) : null}
      </section>

      <AlertBanner alert={alert} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Total Milk Earnings"
          value={formatAmount(detail.cycle.total_milk_amount)}
          detail="Milk amount accumulated inside this cycle."
        />
        <SummaryCard
          title="Total Credit"
          value={formatAmount(detail.cycle.total_credit)}
          detail="Payments and item credits for this cycle."
        />
        <SummaryCard
          title="Total Debit"
          value={formatAmount(detail.cycle.total_debit)}
          detail="Payments and item debits for this cycle."
        />
        <SummaryCard
          title="Carry Forward"
          value={formatAmount(detail.cycle.carry_forward)}
          detail="Balance brought in from the previous cycle."
        />
        <SummaryCard
          title="Net Balance"
          value={formatAmount(detail.cycle.net_balance)}
          detail="This cycle only: Milk - Credit + Debit."
        />
        <SummaryCard
          title="Final Balance"
          value={formatAmount(detail.cycle.final_balance)}
          detail="Carry forward plus net balance."
          accent="primary"
        />
      </section>

      <section className="space-y-6">
        <section className="rounded-[2rem] border border-border/80 bg-white/80 p-6 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-7">
          <h3 className="text-xl font-semibold text-foreground">Milk entries</h3>
          {detail.milkEntries.length ? (
            <div className="mt-6 overflow-hidden rounded-3xl border border-border">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-surface">
                    <tr className="text-left text-muted">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Shift</th>
                      <th className="px-4 py-3 font-medium">Weight</th>
                      <th className="px-4 py-3 font-medium">Fat</th>
                      <th className="px-4 py-3 font-medium">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {detail.milkEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 text-foreground">{entry.date}</td>
                        <td className="px-4 py-3 text-foreground">
                          {formatShiftLabel(entry.shift)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {formatAmount(entry.weight)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {formatAmount(entry.fat)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatAmount(entry.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No milk entries in this cycle.</p>
          )}
        </section>

        <section className="rounded-[2rem] border border-border/80 bg-white/80 p-6 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-7">
          <h3 className="text-xl font-semibold text-foreground">Item transactions</h3>
          {detail.itemTransactions.length ? (
            <div className="mt-6 overflow-hidden rounded-3xl border border-border">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-surface">
                    <tr className="text-left text-muted">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Shift</th>
                      <th className="px-4 py-3 font-medium">Item</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {detail.itemTransactions.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-foreground">{item.date}</td>
                        <td className="px-4 py-3 text-foreground">
                          {formatShiftLabel(item.shift)}
                        </td>
                        <td className="px-4 py-3 text-foreground">{item.item_name}</td>
                        <td className="px-4 py-3 text-foreground">
                          {formatTransactionType(item.type)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatAmount(item.amount)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {buildItemTransactionNote(item.item_name, item.note)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              No item transactions in this cycle.
            </p>
          )}
        </section>

        <section className="rounded-[2rem] border border-border/80 bg-white/80 p-6 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-7">
          <h3 className="text-xl font-semibold text-foreground">Payments</h3>
          {detail.payments.length ? (
            <div className="mt-6 overflow-hidden rounded-3xl border border-border">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-surface">
                    <tr className="text-left text-muted">
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {detail.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 text-foreground">{payment.date}</td>
                        <td className="px-4 py-3 text-foreground">
                          {formatTransactionType(payment.type)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatAmount(payment.amount)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {payment.note ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              No payment transactions in this cycle.
            </p>
          )}
        </section>
      </section>
    </div>
  );
}
