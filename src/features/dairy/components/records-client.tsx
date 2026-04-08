"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, LoaderCircle, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import { AlertBanner } from "./alert-banner";
import { SummaryCard } from "./summary-card";
import { buildSummary } from "../lib/calculations";
import { TRANSACTION_TYPE_OPTIONS } from "../lib/constants";
import {
  buildCombinedRecords,
  fetchRecords,
  insertTransaction,
} from "../lib/data";
import {
  formatDateRange,
  formatDisplayDate,
  getMonthStartDateString,
  getTodayDateString,
} from "../lib/date";
import { exportRecordsToCsv, exportRecordsToPdf } from "../lib/export";
import {
  formatAmount,
  formatLedgerStatus,
  formatShiftLabel,
  formatTransactionType,
} from "../lib/formatting";
import { fetchCycleLockForDate } from "../lib/ledger";
import type {
  AlertState,
  CycleLockState,
  ItemTransactionRow,
  MilkEntryRow,
  TransactionInput,
  TransactionRow,
} from "../lib/types";
import { validateTransaction } from "../lib/validation";

const initialTransactionForm = (today: string): TransactionInput => ({
  date: today,
  type: "credit",
  amount: "",
  note: "",
});

export function RecordsClient() {
  const today = getTodayDateString();
  const supabase = useRef(createClient()).current;
  const [startDate, setStartDate] = useState(getMonthStartDateString());
  const [endDate, setEndDate] = useState(today);
  const [milkEntries, setMilkEntries] = useState<MilkEntryRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [itemTransactions, setItemTransactions] = useState<ItemTransactionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transactionForm, setTransactionForm] = useState<TransactionInput>(
    initialTransactionForm(today),
  );
  const [transactionLock, setTransactionLock] = useState<CycleLockState | null>(null);
  const [isSavingTransaction, setIsSavingTransaction] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);

  const summary = buildSummary(milkEntries, transactions, itemTransactions);
  const combinedRecords = buildCombinedRecords(
    milkEntries,
    transactions,
    itemTransactions,
  );

  async function refreshRecords() {
    if (!startDate || !endDate) {
      setFetchError("Select both a start date and an end date.");
      setIsLoading(false);
      return;
    }

    if (startDate > endDate) {
      setFetchError("Start date cannot be later than end date.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      const data = await fetchRecords(supabase, startDate, endDate);
      setMilkEntries(data.milkEntries);
      setTransactions(data.transactions);
      setItemTransactions(data.itemTransactions);
    } catch (error) {
      setFetchError(
        error instanceof Error ? error.message : "Unable to load filtered records.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadFilteredRecords() {
      if (!startDate || !endDate) {
        if (isActive) {
          setFetchError("Select both a start date and an end date.");
          setIsLoading(false);
        }
        return;
      }

      if (startDate > endDate) {
        if (isActive) {
          setFetchError("Start date cannot be later than end date.");
          setIsLoading(false);
        }
        return;
      }

      if (isActive) {
        setIsLoading(true);
        setFetchError(null);
      }

      try {
        const data = await fetchRecords(supabase, startDate, endDate);

        if (!isActive) {
          return;
        }

        setMilkEntries(data.milkEntries);
        setTransactions(data.transactions);
        setItemTransactions(data.itemTransactions);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setFetchError(
          error instanceof Error
            ? error.message
            : "Unable to load filtered records.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadFilteredRecords();

    return () => {
      isActive = false;
    };
  }, [endDate, startDate, supabase]);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    let isActive = true;

    async function loadTransactionLock() {
      try {
        const lockState = await fetchCycleLockForDate(
          supabase,
          transactionForm.date,
        );

        if (isActive) {
          setTransactionLock(lockState);
        }
      } catch {
        if (isActive) {
          setTransactionLock(null);
        }
      }
    }

    void loadTransactionLock();

    return () => {
      isActive = false;
    };
  }, [dialogOpen, supabase, transactionForm.date]);

  async function handleTransactionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAlert(null);

    if (transactionLock?.isLocked) {
      setAlert({
        tone: "warning",
        message: `${transactionLock.cycleLabel} is closed. You cannot save payments into a closed cycle.`,
      });
      return;
    }

    const validation = validateTransaction(transactionForm);

    if (validation.error || !validation.payload) {
      setAlert({
        tone: "error",
        message: validation.error ?? "Invalid transaction data.",
      });
      return;
    }

    setIsSavingTransaction(true);

    try {
      await insertTransaction(supabase, validation.payload);
      await refreshRecords();
      setDialogOpen(false);
      setTransactionForm(initialTransactionForm(today));
      setAlert({
        tone: "success",
        message: "Payment saved successfully.",
      });
    } catch (error) {
      setAlert({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to save transaction.",
      });
    } finally {
      setIsSavingTransaction(false);
    }
  }

  function handleCsvExport() {
    exportRecordsToCsv(combinedRecords, summary, startDate, endDate);
  }

  function handlePdfExport() {
    exportRecordsToPdf(combinedRecords, summary, startDate, endDate);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border/80 bg-white/80 p-6 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">End date</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-strong"
            >
              <Plus className="h-4 w-4" />
              Add payment
            </button>
            <button
              type="button"
              onClick={handleCsvExport}
              disabled={!combinedRecords.length}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/6 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handlePdfExport}
              disabled={!combinedRecords.length}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/6 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-muted">
          Active range: {formatDateRange(startDate, endDate)}
        </p>
      </section>

      <AlertBanner alert={alert} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Milk Amount"
          value={formatAmount(summary.totalMilkAmount)}
          detail="Sum of filtered milk entry totals."
        />
        <SummaryCard
          title="Total Credit"
          value={formatAmount(summary.totalCredit)}
          detail="Payments and item credits in the selected range."
        />
        <SummaryCard
          title="Total Debit"
          value={formatAmount(summary.totalDebit)}
          detail="Payments and item debits in the selected range."
        />
        <SummaryCard
          title="Remaining Balance"
          value={formatAmount(summary.remainingBalance)}
          detail="Calculated as Milk Amount - Credit + Debit."
          accent="primary"
        />
      </section>

      <section className="rounded-[2rem] border border-border/80 bg-white/80 p-6 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Transactions table
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Combined milk earnings, item adjustments, and payment transactions for
              the selected range.
            </p>
          </div>
          <p className="text-sm text-muted">
            {combinedRecords.length} {combinedRecords.length === 1 ? "record" : "records"}
          </p>
        </div>

        {fetchError ? (
          <div className="mt-5 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {fetchError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-6 flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-border bg-surface">
            <div className="flex items-center gap-3 text-sm text-muted">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading filtered records...
            </div>
          </div>
        ) : combinedRecords.length ? (
          <div className="mt-6 overflow-hidden rounded-3xl border border-border">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface">
                  <tr className="text-left text-muted">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Shift</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {combinedRecords.map((record) => (
                    <tr key={`${record.entry_type}-${record.id}`}>
                      <td className="px-4 py-3 text-foreground">
                        {formatDisplayDate(record.date)}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {formatTransactionType(record.type)}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {formatShiftLabel(record.shift)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatAmount(record.amount)}
                      </td>
                      <td className="px-4 py-3 text-foreground">{record.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-border bg-surface px-6 py-12 text-center">
            <p className="text-base font-medium text-foreground">
              No records found for the selected range.
            </p>
            <p className="mt-2 text-sm text-muted">
              Adjust the date filter or add a payment to populate this view.
            </p>
          </div>
        )}
      </section>

      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-[2rem] border border-border/80 bg-white p-6 shadow-[0_30px_80px_-38px_rgba(35,49,39,0.55)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/75">
                  Payment
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  Add payment transaction
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Payment entries are blocked automatically when the selected cycle
                  has already been closed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-full border border-border px-3 py-1 text-sm font-medium text-muted transition hover:border-primary/30 hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
              <span className="font-medium text-foreground">
                {transactionLock?.cycleLabel ?? "Cycle loading..."}
              </span>
              <span className="mx-2">•</span>
              <span>
                {transactionLock
                  ? formatLedgerStatus(transactionLock.status)
                  : "Open"}
              </span>
            </div>

            <form onSubmit={handleTransactionSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Date</span>
                  <input
                    required
                    type="date"
                    value={transactionForm.date}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Type</span>
                  <select
                    value={transactionForm.type}
                    onChange={(event) =>
                      setTransactionForm((current) => ({
                        ...current,
                        type: event.target.value as TransactionInput["type"],
                      }))
                    }
                    className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                  >
                    {TRANSACTION_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Amount</span>
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={transactionForm.amount}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                  className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Note</span>
                <textarea
                  rows={4}
                  value={transactionForm.note}
                  onChange={(event) =>
                    setTransactionForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  placeholder="Optional note"
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm"
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-white px-5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/6"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTransaction || transactionLock?.isLocked}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingTransaction ? "Saving payment..." : "Save payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
