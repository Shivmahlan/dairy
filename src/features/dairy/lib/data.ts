import { type SupabaseClient } from "@supabase/supabase-js";

import { sortCombinedRecords } from "./calculations";
import {
  buildItemTransactionNote,
  buildMilkNote,
} from "./formatting";
import { assertCycleOpenForDate } from "./ledger";
import type {
  CombinedRecordRow,
  ItemTransactionRow,
  MilkEntryRow,
  TransactionRow,
} from "./types";

function normalizeMilkEntry(row: Record<string, unknown>): MilkEntryRow {
  return {
    id: String(row.id),
    business_id: String(row.business_id ?? ""),
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
    business_id: String(row.business_id ?? ""),
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
    business_id: String(row.business_id ?? ""),
    date: String(row.date),
    shift: row.shift === "evening" ? "evening" : "morning",
    item_name: String(row.item_name ?? ""),
    type: row.type === "debit" ? "debit" : "credit",
    amount: Number(row.amount ?? 0),
    note: row.note ? String(row.note) : null,
    created_at: String(row.created_at ?? ""),
  };
}

export async function fetchMilkEntriesForDate(
  supabase: SupabaseClient,
  businessId: string,
  date: string,
) {
  const { data, error } = await supabase
    .from("milk_entries")
    .select("id, business_id, date, shift, weight, fat, total_amount, created_at")
    .eq("business_id", businessId)
    .eq("date", date)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const shiftOrder = { morning: 0, evening: 1 };

  return (data ?? [])
    .map((row) => normalizeMilkEntry(row as Record<string, unknown>))
    .sort((left, right) => {
      const shiftDifference = shiftOrder[left.shift] - shiftOrder[right.shift];

      if (shiftDifference !== 0) {
        return shiftDifference;
      }

      return right.created_at.localeCompare(left.created_at);
    });
}

export async function fetchItemTransactionsForDate(
  supabase: SupabaseClient,
  businessId: string,
  date: string,
) {
  const { data, error } = await supabase
    .from("item_transactions")
    .select(
      "id, business_id, date, shift, item_name, type, amount, note, created_at",
    )
    .eq("business_id", businessId)
    .eq("date", date)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const shiftOrder = { morning: 0, evening: 1 };

  return (data ?? [])
    .map((row) => normalizeItemTransaction(row as Record<string, unknown>))
    .sort((left, right) => {
      const shiftDifference = shiftOrder[left.shift] - shiftOrder[right.shift];

      if (shiftDifference !== 0) {
        return shiftDifference;
      }

      return right.created_at.localeCompare(left.created_at);
    });
}

export async function insertMilkEntry(
  supabase: SupabaseClient,
  payload: Pick<
    MilkEntryRow,
    "business_id" | "date" | "shift" | "weight" | "fat" | "total_amount"
  >,
) {
  await assertCycleOpenForDate(supabase, payload.business_id, payload.date);

  const { error } = await supabase.from("milk_entries").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function insertItemTransaction(
  supabase: SupabaseClient,
  payload: Pick<
    ItemTransactionRow,
    "business_id" | "date" | "shift" | "item_name" | "type" | "amount" | "note"
  >,
) {
  await assertCycleOpenForDate(supabase, payload.business_id, payload.date);

  const { error } = await supabase.from("item_transactions").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchRecords(
  supabase: SupabaseClient,
  businessId: string,
  startDate: string,
  endDate: string,
) {
  const [milkEntriesResponse, transactionsResponse, itemTransactionsResponse] =
    await Promise.all([
      supabase
        .from("milk_entries")
        .select("id, business_id, date, shift, weight, fat, total_amount, created_at")
        .eq("business_id", businessId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("id, business_id, date, type, amount, note, created_at")
        .eq("business_id", businessId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("item_transactions")
        .select(
          "id, business_id, date, shift, item_name, type, amount, note, created_at",
        )
        .eq("business_id", businessId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

  if (milkEntriesResponse.error) {
    throw new Error(milkEntriesResponse.error.message);
  }

  if (transactionsResponse.error) {
    throw new Error(transactionsResponse.error.message);
  }

  if (itemTransactionsResponse.error) {
    throw new Error(itemTransactionsResponse.error.message);
  }

  const milkEntries = (milkEntriesResponse.data ?? []).map((row) =>
    normalizeMilkEntry(row as Record<string, unknown>),
  );
  const transactions = (transactionsResponse.data ?? []).map((row) =>
    normalizeTransaction(row as Record<string, unknown>),
  );
  const itemTransactions = (itemTransactionsResponse.data ?? []).map((row) =>
    normalizeItemTransaction(row as Record<string, unknown>),
  );

  return { milkEntries, transactions, itemTransactions };
}

export async function insertTransaction(
  supabase: SupabaseClient,
  payload: Pick<
    TransactionRow,
    "business_id" | "date" | "type" | "amount" | "note"
  >,
) {
  await assertCycleOpenForDate(supabase, payload.business_id, payload.date);

  const { error } = await supabase.from("transactions").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export function buildCombinedRecords(
  milkEntries: MilkEntryRow[],
  transactions: TransactionRow[],
  itemTransactions: ItemTransactionRow[] = [],
) {
  const rows: CombinedRecordRow[] = [
    ...milkEntries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      entry_type: "milk" as const,
      type: "milk" as const,
      shift: entry.shift,
      amount: entry.total_amount,
      item_name: null,
      note: buildMilkNote(entry.shift),
      created_at: entry.created_at,
    })),
    ...transactions.map((transaction) => ({
      id: transaction.id,
      date: transaction.date,
      entry_type: "payment" as const,
      type: transaction.type,
      shift: null,
      amount: transaction.amount,
      item_name: null,
      note: transaction.note ?? "-",
      created_at: transaction.created_at,
    })),
    ...itemTransactions.map((transaction) => ({
      id: transaction.id,
      date: transaction.date,
      entry_type: "item" as const,
      type: transaction.type,
      shift: transaction.shift,
      amount: transaction.amount,
      item_name: transaction.item_name,
      note: buildItemTransactionNote(transaction.item_name, transaction.note),
      created_at: transaction.created_at,
    })),
  ];

  return sortCombinedRecords(rows);
}
