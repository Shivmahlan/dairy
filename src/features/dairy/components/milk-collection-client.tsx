"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calculator,
  LoaderCircle,
  PackagePlus,
  Scale,
  ShoppingBag,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import { AlertBanner } from "./alert-banner";
import { calculateTotalAmount } from "../lib/calculations";
import {
  SHIFT_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
} from "../lib/constants";
import {
  fetchItemTransactionsForDate,
  fetchMilkEntriesForDate,
  insertItemTransaction,
  insertMilkEntry,
} from "../lib/data";
import { formatDisplayDate, getTodayDateString } from "../lib/date";
import {
  buildItemTransactionNote,
  formatAmount,
  formatLedgerStatus,
  formatShiftLabel,
  formatTransactionType,
} from "../lib/formatting";
import { fetchCycleLockForDate } from "../lib/ledger";
import type {
  AlertState,
  CycleLockState,
  ItemTransactionInput,
  ItemTransactionRow,
  MilkEntryInput,
  MilkEntryRow,
} from "../lib/types";
import {
  validateItemTransaction,
  validateMilkEntry,
} from "../lib/validation";

export function MilkCollectionClient() {
  const today = getTodayDateString();
  const supabase = useRef(createClient()).current;
  const [milkForm, setMilkForm] = useState<MilkEntryInput>({
    date: today,
    shift: "morning",
    weight: "",
    fat: "",
  });
  const [itemForm, setItemForm] = useState<ItemTransactionInput>({
    date: today,
    shift: "morning",
    itemName: "",
    type: "credit",
    amount: "",
    note: "",
  });
  const [milkEntries, setMilkEntries] = useState<MilkEntryRow[]>([]);
  const [itemTransactions, setItemTransactions] = useState<ItemTransactionRow[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [isSavingMilk, setIsSavingMilk] = useState(false);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [milkAlert, setMilkAlert] = useState<AlertState | null>(null);
  const [itemAlert, setItemAlert] = useState<AlertState | null>(null);
  const [milkLock, setMilkLock] = useState<CycleLockState | null>(null);
  const [itemLock, setItemLock] = useState<CycleLockState | null>(null);

  const liveTotal = calculateTotalAmount(
    Number(milkForm.weight || 0),
    Number(milkForm.fat || 0),
  );

  async function refreshTodayActivity() {
    setTablesLoading(true);
    setTablesError(null);

    try {
      const [entries, items] = await Promise.all([
        fetchMilkEntriesForDate(supabase, today),
        fetchItemTransactionsForDate(supabase, today),
      ]);

      setMilkEntries(entries);
      setItemTransactions(items);
    } catch (error) {
      setTablesError(
        error instanceof Error
          ? error.message
          : "Unable to load today's activity.",
      );
    } finally {
      setTablesLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    async function loadTodayActivity() {
      setTablesLoading(true);
      setTablesError(null);

      try {
        const [entries, items] = await Promise.all([
          fetchMilkEntriesForDate(supabase, today),
          fetchItemTransactionsForDate(supabase, today),
        ]);

        if (!isActive) {
          return;
        }

        setMilkEntries(entries);
        setItemTransactions(items);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setTablesError(
          error instanceof Error
            ? error.message
            : "Unable to load today's activity.",
        );
      } finally {
        if (isActive) {
          setTablesLoading(false);
        }
      }
    }

    void loadTodayActivity();

    return () => {
      isActive = false;
    };
  }, [supabase, today]);

  useEffect(() => {
    let isActive = true;

    async function loadMilkLock() {
      try {
        const lockState = await fetchCycleLockForDate(supabase, milkForm.date);

        if (isActive) {
          setMilkLock(lockState);
        }
      } catch {
        if (isActive) {
          setMilkLock(null);
        }
      }
    }

    void loadMilkLock();

    return () => {
      isActive = false;
    };
  }, [milkForm.date, supabase]);

  useEffect(() => {
    let isActive = true;

    async function loadItemLock() {
      try {
        const lockState = await fetchCycleLockForDate(supabase, itemForm.date);

        if (isActive) {
          setItemLock(lockState);
        }
      } catch {
        if (isActive) {
          setItemLock(null);
        }
      }
    }

    void loadItemLock();

    return () => {
      isActive = false;
    };
  }, [itemForm.date, supabase]);

  async function handleMilkSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMilkAlert(null);

    if (milkLock?.isLocked) {
      setMilkAlert({
        tone: "warning",
        message: `${milkLock.cycleLabel} is closed. You cannot save milk entries into a closed cycle.`,
      });
      return;
    }

    const validation = validateMilkEntry(milkForm);

    if (validation.error || !validation.payload) {
      setMilkAlert({
        tone: "error",
        message: validation.error ?? "Invalid milk entry.",
      });
      return;
    }

    setIsSavingMilk(true);

    try {
      await insertMilkEntry(supabase, validation.payload);

      if (milkForm.date === today) {
        await refreshTodayActivity();
      }

      setMilkForm((current) => ({
        ...current,
        weight: "",
        fat: "",
      }));
      setMilkAlert({
        tone: "success",
        message: "Milk entry saved successfully.",
      });
    } catch (error) {
      setMilkAlert({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Unable to save milk entry.",
      });
    } finally {
      setIsSavingMilk(false);
    }
  }

  async function handleItemSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setItemAlert(null);

    if (itemLock?.isLocked) {
      setItemAlert({
        tone: "warning",
        message: `${itemLock.cycleLabel} is closed. You cannot save item transactions into a closed cycle.`,
      });
      return;
    }

    const validation = validateItemTransaction(itemForm);

    if (validation.error || !validation.payload) {
      setItemAlert({
        tone: "error",
        message: validation.error ?? "Invalid item transaction.",
      });
      return;
    }

    setIsSavingItem(true);

    try {
      await insertItemTransaction(supabase, validation.payload);

      if (itemForm.date === today) {
        await refreshTodayActivity();
      }

      setItemForm((current) => ({
        ...current,
        itemName: "",
        amount: "",
        note: "",
      }));
      setItemAlert({
        tone: "success",
        message: "Item transaction saved successfully.",
      });
    } catch (error) {
      setItemAlert({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save item transaction.",
      });
    } finally {
      setIsSavingItem(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-border/80 bg-white/80 p-6 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-7">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/80 text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Milk entry</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Total amount updates live using weight x fat x 8.5.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            <span className="font-medium text-foreground">
              {milkLock?.cycleLabel ?? "Cycle loading..."}
            </span>
            <span className="mx-2">•</span>
            <span>{milkLock ? formatLedgerStatus(milkLock.status) : "Open"}</span>
          </div>

          <div className="mt-4">
            <AlertBanner alert={milkAlert} />
          </div>

          <form onSubmit={handleMilkSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Date</span>
                <input
                  required
                  type="date"
                  value={milkForm.date}
                  onChange={(event) =>
                    setMilkForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Shift</span>
                <select
                  value={milkForm.shift}
                  onChange={(event) =>
                    setMilkForm((current) => ({
                      ...current,
                      shift: event.target.value as MilkEntryInput["shift"],
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                >
                  {SHIFT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Milk weight (kg)</span>
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-white px-4">
                  <Scale className="h-4 w-4 text-muted" />
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={milkForm.weight}
                    onChange={(event) =>
                      setMilkForm((current) => ({
                        ...current,
                        weight: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="h-full w-full bg-transparent text-sm"
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Milk fat (%)</span>
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-white px-4">
                  <Calculator className="h-4 w-4 text-muted" />
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={milkForm.fat}
                    onChange={(event) =>
                      setMilkForm((current) => ({
                        ...current,
                        fat: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="h-full w-full bg-transparent text-sm"
                  />
                </div>
              </label>
            </div>

            <div className="rounded-3xl border border-primary/15 bg-primary/8 p-5">
              <p className="text-sm font-medium text-muted">Live calculated total</p>
              <p className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
                {formatAmount(liveTotal)}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Formula: weight x fat x 8.5
              </p>
            </div>

            <button
              type="submit"
              disabled={isSavingMilk || milkLock?.isLocked}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingMilk ? "Saving entry..." : "Save milk entry"}
            </button>
          </form>
        </section>

        <section className="rounded-[2rem] border border-border/80 bg-white/80 p-6 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-7">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/80 text-primary">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Item credit or debit
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Record item-based adjustments that feed directly into ledger totals.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            <span className="font-medium text-foreground">
              {itemLock?.cycleLabel ?? "Cycle loading..."}
            </span>
            <span className="mx-2">•</span>
            <span>{itemLock ? formatLedgerStatus(itemLock.status) : "Open"}</span>
          </div>

          <div className="mt-4">
            <AlertBanner alert={itemAlert} />
          </div>

          <form onSubmit={handleItemSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Date</span>
                <input
                  required
                  type="date"
                  value={itemForm.date}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Shift</span>
                <select
                  value={itemForm.shift}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      shift: event.target.value as ItemTransactionInput["shift"],
                    }))
                  }
                  className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm"
                >
                  {SHIFT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Item name</span>
                <div className="flex h-12 items-center gap-3 rounded-2xl border border-border bg-white px-4">
                  <ShoppingBag className="h-4 w-4 text-muted" />
                  <input
                    required
                    type="text"
                    value={itemForm.itemName}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        itemName: event.target.value,
                      }))
                    }
                    placeholder="Feed, medicine, transport..."
                    className="h-full w-full bg-transparent text-sm"
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">Type</span>
                <select
                  value={itemForm.type}
                  onChange={(event) =>
                    setItemForm((current) => ({
                      ...current,
                      type: event.target.value as ItemTransactionInput["type"],
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
                value={itemForm.amount}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="0.00"
                className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Notes</span>
              <textarea
                rows={4}
                value={itemForm.note}
                onChange={(event) =>
                  setItemForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Optional note"
                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm"
              />
            </label>

            <button
              type="submit"
              disabled={isSavingItem || itemLock?.isLocked}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingItem ? "Saving item..." : "Save item transaction"}
            </button>
          </form>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] border border-border/80 bg-white/80 p-6 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Today&apos;s milk entries</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                {formatDisplayDate(today)}
              </p>
            </div>
            <p className="text-sm text-muted">
              {milkEntries.length} {milkEntries.length === 1 ? "entry" : "entries"}
            </p>
          </div>

          {tablesError ? (
            <div className="mt-5 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {tablesError}
            </div>
          ) : null}

          {tablesLoading ? (
            <div className="mt-6 flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-border bg-surface">
              <div className="flex items-center gap-3 text-sm text-muted">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading today&apos;s milk entries...
              </div>
            </div>
          ) : milkEntries.length ? (
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
                    {milkEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 text-foreground">
                          {formatDisplayDate(entry.date)}
                        </td>
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
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-surface px-6 py-12 text-center">
              <p className="text-base font-medium text-foreground">
                No milk entries for today yet.
              </p>
              <p className="mt-2 text-sm text-muted">
                Save the first morning or evening collection to see it here.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-border/80 bg-white/80 p-6 shadow-[0_24px_70px_-38px_rgba(35,49,39,0.45)] backdrop-blur sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Today&apos;s item transactions
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Item credits and debits linked to today&apos;s cycle.
              </p>
            </div>
            <p className="text-sm text-muted">
              {itemTransactions.length} {itemTransactions.length === 1 ? "record" : "records"}
            </p>
          </div>

          {tablesLoading ? (
            <div className="mt-6 flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-border bg-surface">
              <div className="flex items-center gap-3 text-sm text-muted">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading today&apos;s item transactions...
              </div>
            </div>
          ) : itemTransactions.length ? (
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
                    {itemTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-4 py-3 text-foreground">
                          {formatDisplayDate(transaction.date)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {formatShiftLabel(transaction.shift)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {transaction.item_name}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {formatTransactionType(transaction.type)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {formatAmount(transaction.amount)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {buildItemTransactionNote(
                            transaction.item_name,
                            transaction.note,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-surface px-6 py-12 text-center">
              <p className="text-base font-medium text-foreground">
                No item transactions for today yet.
              </p>
              <p className="mt-2 text-sm text-muted">
                Add item credits or debits to include them in the ledger cycle.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
