import { type SupabaseClient } from "@supabase/supabase-js";

import {
  calculateFinalBalance,
  calculateRemainingBalance,
  getCurrentCycleBalance,
  roundAmount,
} from "./calculations";
import { getTodayDateString } from "./date";
import { getBalanceTone } from "./formatting";
import type {
  CycleLockState,
  ItemTransactionRow,
  LedgerCycleComputed,
  LedgerCycleDetailData,
  LedgerCycleRow,
  LedgerOverviewData,
  MilkEntryRow,
  TransactionRow,
} from "./types";

interface CyclePeriod {
  startDate: string;
  endDate: string;
  cycleNumber: 1 | 2 | 3;
}

function getDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return { year, month, day };
}

function buildDateString(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}

function getLastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getCycleNumberByDay(day: number): 1 | 2 | 3 {
  if (day <= 10) {
    return 1;
  }

  if (day <= 20) {
    return 2;
  }

  return 3;
}

function getCyclePeriodForMonth(
  year: number,
  month: number,
  cycleNumber: 1 | 2 | 3,
): CyclePeriod {
  const lastDay = getLastDayOfMonth(year, month);

  if (cycleNumber === 1) {
    return {
      startDate: buildDateString(year, month, 1),
      endDate: buildDateString(year, month, 10),
      cycleNumber,
    };
  }

  if (cycleNumber === 2) {
    return {
      startDate: buildDateString(year, month, 11),
      endDate: buildDateString(year, month, 20),
      cycleNumber,
    };
  }

  return {
    startDate: buildDateString(year, month, 21),
    endDate: buildDateString(year, month, lastDay),
    cycleNumber,
  };
}

export function getCyclePeriodForDate(date: string) {
  const { year, month, day } = getDateParts(date);
  const cycleNumber = getCycleNumberByDay(day);

  return getCyclePeriodForMonth(year, month, cycleNumber);
}

function buildCyclesForMonth(year: number, month: number) {
  return [
    getCyclePeriodForMonth(year, month, 1),
    getCyclePeriodForMonth(year, month, 2),
    getCyclePeriodForMonth(year, month, 3),
  ];
}

function buildCycleKey(startDate: string, endDate: string) {
  return `${startDate}:${endDate}`;
}

export function formatCycleLabel(startDate: string, endDate: string) {
  const startDay = Number(startDate.slice(8, 10));
  const cycleNumber = startDay === 1 ? 1 : startDay === 11 ? 2 : 3;

  return `Cycle ${cycleNumber} • ${startDate} to ${endDate}`;
}

function normalizeLedgerCycle(row: Record<string, unknown>): LedgerCycleRow {
  return {
    id: String(row.id),
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    total_milk_amount: Number(row.total_milk_amount ?? 0),
    total_credit: Number(row.total_credit ?? 0),
    total_debit: Number(row.total_debit ?? 0),
    net_balance: Number(row.net_balance ?? 0),
    carry_forward: Number(row.carry_forward ?? 0),
    status: row.status === "closed" ? "closed" : "open",
    created_at: String(row.created_at ?? ""),
  };
}

function normalizeMilkEntry(row: Record<string, unknown>): MilkEntryRow {
  return {
    id: String(row.id),
    date: String(row.date),
    shift: row.shift === "evening" ? "evening" : "morning",
    weight: Number(row.weight ?? 0),
    fat: Number(row.fat ?? 0),
    total_amount: Number(row.total_amount ?? 0),
    created_at: String(row.created_at ?? ""),
  };
}

function normalizeTransaction(row: Record<string, unknown>): TransactionRow {
  return {
    id: String(row.id),
    date: String(row.date),
    type: row.type === "debit" ? "debit" : "credit",
    amount: Number(row.amount ?? 0),
    note: row.note ? String(row.note) : null,
    created_at: String(row.created_at ?? ""),
  };
}

function normalizeItemTransaction(
  row: Record<string, unknown>,
): ItemTransactionRow {
  return {
    id: String(row.id),
    date: String(row.date),
    shift: row.shift === "evening" ? "evening" : "morning",
    item_name: String(row.item_name ?? ""),
    type: row.type === "debit" ? "debit" : "credit",
    amount: Number(row.amount ?? 0),
    note: row.note ? String(row.note) : null,
    created_at: String(row.created_at ?? ""),
  };
}

async function fetchEdgeDate(
  supabase: SupabaseClient,
  table: "milk_entries" | "transactions" | "item_transactions",
  direction: "asc" | "desc",
) {
  const { data, error } = await supabase
    .from(table)
    .select("date")
    .order("date", { ascending: direction === "asc" })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0]?.date ? String(data[0].date) : null;
}

async function determineLedgerDateRange(supabase: SupabaseClient) {
  const [firstMilk, firstTransaction, firstItem, firstCycle, lastMilk, lastTransaction, lastItem] =
    await Promise.all([
      fetchEdgeDate(supabase, "milk_entries", "asc"),
      fetchEdgeDate(supabase, "transactions", "asc"),
      fetchEdgeDate(supabase, "item_transactions", "asc"),
      supabase
        .from("ledger_cycles")
        .select("start_date")
        .order("start_date", { ascending: true })
        .limit(1),
      fetchEdgeDate(supabase, "milk_entries", "desc"),
      fetchEdgeDate(supabase, "transactions", "desc"),
      fetchEdgeDate(supabase, "item_transactions", "desc"),
    ]);

  const firstDates = [
    firstMilk,
    firstTransaction,
    firstItem,
    firstCycle.data?.[0]?.start_date ? String(firstCycle.data[0].start_date) : null,
  ].filter(Boolean) as string[];

  const lastDates = [lastMilk, lastTransaction, lastItem].filter(Boolean) as string[];
  const today = getTodayDateString();

  const startDate = firstDates.length
    ? `${firstDates.sort()[0].slice(0, 7)}-01`
    : `${today.slice(0, 7)}-01`;
  const endDate = lastDates.length ? [...lastDates, today].sort().at(-1) ?? today : today;

  return { startDate, endDate };
}

function buildCyclesBetween(startDate: string, endDate: string) {
  const { year: startYear, month: startMonth } = getDateParts(startDate);
  const { year: endYear, month: endMonth } = getDateParts(endDate);

  const cycles: CyclePeriod[] = [];
  let currentYear = startYear;
  let currentMonth = startMonth;

  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    cycles.push(...buildCyclesForMonth(currentYear, currentMonth));

    if (currentMonth === 12) {
      currentMonth = 1;
      currentYear += 1;
    } else {
      currentMonth += 1;
    }
  }

  return cycles;
}

async function ensureLedgerCyclesForRange(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
) {
  const cycleRows = buildCyclesBetween(startDate, endDate).map((cycle) => ({
    start_date: cycle.startDate,
    end_date: cycle.endDate,
    total_milk_amount: 0,
    total_credit: 0,
    total_debit: 0,
    net_balance: 0,
    carry_forward: 0,
    status: "open",
  }));

  if (!cycleRows.length) {
    return;
  }

  const { error } = await supabase.from("ledger_cycles").upsert(cycleRows, {
    onConflict: "start_date,end_date",
    ignoreDuplicates: true,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function buildComputedCycles(cycles: LedgerCycleRow[]) {
  const today = getTodayDateString();
  let allPreviousClosed = true;

  return cycles.map((cycle) => {
    const cycleNumber = getCyclePeriodForDate(cycle.start_date).cycleNumber;
    const finalBalance = calculateFinalBalance(cycle.carry_forward, cycle.net_balance);
    const isCurrent = today >= cycle.start_date && today <= cycle.end_date;
    const canClose =
      cycle.status === "open" &&
      allPreviousClosed &&
      today > cycle.end_date;

    if (cycle.status === "open") {
      allPreviousClosed = false;
    }

    return {
      ...cycle,
      cycle_number: cycleNumber,
      label: formatCycleLabel(cycle.start_date, cycle.end_date),
      final_balance: finalBalance,
      can_close: canClose,
      is_current: isCurrent,
    } satisfies LedgerCycleComputed;
  });
}

export async function syncLedgerCycles(supabase: SupabaseClient) {
  const { startDate, endDate } = await determineLedgerDateRange(supabase);

  await ensureLedgerCyclesForRange(supabase, startDate, endDate);

  const { data: cyclesData, error: cyclesError } = await supabase
    .from("ledger_cycles")
    .select(
      "id, start_date, end_date, total_milk_amount, total_credit, total_debit, net_balance, carry_forward, status, created_at",
    )
    .order("start_date", { ascending: true });

  if (cyclesError) {
    throw new Error(cyclesError.message);
  }

  const cycles = (cyclesData ?? []).map((row) =>
    normalizeLedgerCycle(row as Record<string, unknown>),
  );

  if (!cycles.length) {
    return [] as LedgerCycleComputed[];
  }

  const overallStart = cycles[0].start_date;
  const overallEnd = cycles[cycles.length - 1].end_date;

  const [milkResponse, paymentsResponse, itemsResponse] = await Promise.all([
    supabase
      .from("milk_entries")
      .select("id, date, shift, weight, fat, total_amount, created_at")
      .gte("date", overallStart)
      .lte("date", overallEnd),
    supabase
      .from("transactions")
      .select("id, date, type, amount, note, created_at")
      .gte("date", overallStart)
      .lte("date", overallEnd),
    supabase
      .from("item_transactions")
      .select("id, date, shift, item_name, type, amount, note, created_at")
      .gte("date", overallStart)
      .lte("date", overallEnd),
  ]);

  if (milkResponse.error) {
    throw new Error(milkResponse.error.message);
  }

  if (paymentsResponse.error) {
    throw new Error(paymentsResponse.error.message);
  }

  if (itemsResponse.error) {
    throw new Error(itemsResponse.error.message);
  }

  const milkEntries = (milkResponse.data ?? []).map((row) =>
    normalizeMilkEntry(row as Record<string, unknown>),
  );
  const payments = (paymentsResponse.data ?? []).map((row) =>
    normalizeTransaction(row as Record<string, unknown>),
  );
  const itemTransactions = (itemsResponse.data ?? []).map((row) =>
    normalizeItemTransaction(row as Record<string, unknown>),
  );

  const groupedMilk = new Map<string, MilkEntryRow[]>();
  const groupedPayments = new Map<string, TransactionRow[]>();
  const groupedItems = new Map<string, ItemTransactionRow[]>();

  milkEntries.forEach((entry) => {
    const period = getCyclePeriodForDate(entry.date);
    const key = buildCycleKey(period.startDate, period.endDate);
    groupedMilk.set(key, [...(groupedMilk.get(key) ?? []), entry]);
  });

  payments.forEach((payment) => {
    const period = getCyclePeriodForDate(payment.date);
    const key = buildCycleKey(period.startDate, period.endDate);
    groupedPayments.set(key, [...(groupedPayments.get(key) ?? []), payment]);
  });

  itemTransactions.forEach((item) => {
    const period = getCyclePeriodForDate(item.date);
    const key = buildCycleKey(period.startDate, period.endDate);
    groupedItems.set(key, [...(groupedItems.get(key) ?? []), item]);
  });

  let previousFinalBalance = 0;

  const updates = cycles.map((cycle) => {
    const key = buildCycleKey(cycle.start_date, cycle.end_date);
    const cycleMilk = groupedMilk.get(key) ?? [];
    const cyclePayments = groupedPayments.get(key) ?? [];
    const cycleItems = groupedItems.get(key) ?? [];

    const totalMilkAmount = roundAmount(
      cycleMilk.reduce((sum, entry) => sum + entry.total_amount, 0),
    );
    const totalCredit = roundAmount(
      [...cyclePayments, ...cycleItems]
        .filter((entry) => entry.type === "credit")
        .reduce((sum, entry) => sum + entry.amount, 0),
    );
    const totalDebit = roundAmount(
      [...cyclePayments, ...cycleItems]
        .filter((entry) => entry.type === "debit")
        .reduce((sum, entry) => sum + entry.amount, 0),
    );
    const carryForward = previousFinalBalance;
    const netBalance = calculateRemainingBalance(
      totalMilkAmount,
      totalCredit,
      totalDebit,
    );
    const finalBalance = calculateFinalBalance(carryForward, netBalance);

    previousFinalBalance = finalBalance;

    return {
      id: cycle.id,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
      total_milk_amount: totalMilkAmount,
      total_credit: totalCredit,
      total_debit: totalDebit,
      net_balance: netBalance,
      carry_forward: carryForward,
      status: cycle.status,
    };
  });

  const { error: updateError } = await supabase
    .from("ledger_cycles")
    .upsert(updates);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const refreshedCycles = cycles.map((cycle, index) => ({
    ...cycle,
    total_milk_amount: updates[index].total_milk_amount,
    total_credit: updates[index].total_credit,
    total_debit: updates[index].total_debit,
    net_balance: updates[index].net_balance,
    carry_forward: updates[index].carry_forward,
  }));

  return buildComputedCycles(refreshedCycles);
}

export async function fetchLedgerOverview(
  supabase: SupabaseClient,
): Promise<LedgerOverviewData> {
  const cycles = await syncLedgerCycles(supabase);
  const currentCycle =
    cycles.find((cycle) => cycle.is_current) ?? cycles.at(-1) ?? null;
  const currentCycleBalance = getCurrentCycleBalance(currentCycle);
  const totalOutstandingBalance = currentCycle?.final_balance ?? 0;
  const balanceInfo = getBalanceTone(totalOutstandingBalance);

  return {
    cycles: [...cycles].reverse(),
    currentCycle,
    currentCycleBalance,
    totalOutstandingBalance,
    tone: balanceInfo.tone,
    statusText: balanceInfo.label,
  };
}

export async function fetchLedgerCycleDetail(
  supabase: SupabaseClient,
  cycleId: string,
): Promise<LedgerCycleDetailData> {
  const cycles = await syncLedgerCycles(supabase);
  const cycle = cycles.find((entry) => entry.id === cycleId);

  if (!cycle) {
    throw new Error("Ledger cycle not found.");
  }

  const [milkResponse, paymentsResponse, itemsResponse] = await Promise.all([
    supabase
      .from("milk_entries")
      .select("id, date, shift, weight, fat, total_amount, created_at")
      .gte("date", cycle.start_date)
      .lte("date", cycle.end_date)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("id, date, type, amount, note, created_at")
      .gte("date", cycle.start_date)
      .lte("date", cycle.end_date)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("item_transactions")
      .select("id, date, shift, item_name, type, amount, note, created_at")
      .gte("date", cycle.start_date)
      .lte("date", cycle.end_date)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (milkResponse.error) {
    throw new Error(milkResponse.error.message);
  }

  if (paymentsResponse.error) {
    throw new Error(paymentsResponse.error.message);
  }

  if (itemsResponse.error) {
    throw new Error(itemsResponse.error.message);
  }

  return {
    cycle,
    milkEntries: (milkResponse.data ?? []).map((row) =>
      normalizeMilkEntry(row as Record<string, unknown>),
    ),
    payments: (paymentsResponse.data ?? []).map((row) =>
      normalizeTransaction(row as Record<string, unknown>),
    ),
    itemTransactions: (itemsResponse.data ?? []).map((row) =>
      normalizeItemTransaction(row as Record<string, unknown>),
    ),
  };
}

export async function fetchCycleLockForDate(
  supabase: SupabaseClient,
  date: string,
): Promise<CycleLockState> {
  const period = getCyclePeriodForDate(date);

  await ensureLedgerCyclesForRange(supabase, date, date);

  const { data, error } = await supabase
    .from("ledger_cycles")
    .select("status")
    .eq("start_date", period.startDate)
    .eq("end_date", period.endDate)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const status = data?.status === "closed" ? "closed" : "open";

  return {
    isLocked: status === "closed",
    cycleLabel: formatCycleLabel(period.startDate, period.endDate),
    status,
  };
}

export async function assertCycleOpenForDate(
  supabase: SupabaseClient,
  date: string,
) {
  const lockState = await fetchCycleLockForDate(supabase, date);

  if (lockState.isLocked) {
    throw new Error(
      `${lockState.cycleLabel} is already closed. Backtracking into closed cycles is not allowed.`,
    );
  }

  return lockState;
}

export async function closeLedgerCycle(
  supabase: SupabaseClient,
  cycleId: string,
) {
  const cycles = await syncLedgerCycles(supabase);
  const cycleIndex = cycles.findIndex((cycle) => cycle.id === cycleId);

  if (cycleIndex === -1) {
    throw new Error("Ledger cycle not found.");
  }

  const cycle = cycles[cycleIndex];
  const today = getTodayDateString();

  if (cycle.status === "closed") {
    throw new Error("This cycle is already closed.");
  }

  if (today <= cycle.end_date) {
    throw new Error("A cycle can only be closed after its end date has passed.");
  }

  const earlierOpenCycle = cycles
    .slice(0, cycleIndex)
    .find((entry) => entry.status === "open");

  if (earlierOpenCycle) {
    throw new Error(
      `Close ${earlierOpenCycle.label} before closing a later cycle.`,
    );
  }

  const { error } = await supabase
    .from("ledger_cycles")
    .update({ status: "closed" })
    .eq("id", cycleId);

  if (error) {
    throw new Error(error.message);
  }

  return fetchLedgerCycleDetail(supabase, cycleId);
}
