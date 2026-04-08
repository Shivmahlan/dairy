import { MILK_RATE } from "./constants";
import type {
  CombinedRecordRow,
  ItemTransactionRow,
  LedgerCycleComputed,
  MilkEntryRow,
  RecordsSummary,
  TransactionRow,
} from "./types";

export function roundAmount(value: number) {
  return Number(value.toFixed(2));
}

export function calculateTotalAmount(weight: number, fat: number) {
  if (!Number.isFinite(weight) || !Number.isFinite(fat) || weight < 0 || fat < 0) {
    return 0;
  }

  return roundAmount(weight * fat * MILK_RATE);
}

export function calculateRemainingBalance(
  totalMilkAmount: number,
  totalCredit: number,
  totalDebit: number,
) {
  return roundAmount(totalMilkAmount - totalCredit + totalDebit);
}

export function calculateFinalBalance(carryForward: number, netBalance: number) {
  return roundAmount(carryForward + netBalance);
}

export function buildSummary(
  milkEntries: MilkEntryRow[],
  transactions: TransactionRow[],
  itemTransactions: ItemTransactionRow[] = [],
): RecordsSummary {
  const totalMilkAmount = roundAmount(
    milkEntries.reduce((sum, entry) => sum + entry.total_amount, 0),
  );
  const totalCredit = roundAmount(
    [...transactions, ...itemTransactions]
      .filter((transaction) => transaction.type === "credit")
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  );
  const totalDebit = roundAmount(
    [...transactions, ...itemTransactions]
      .filter((transaction) => transaction.type === "debit")
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  );

  return {
    totalMilkAmount,
    totalCredit,
    totalDebit,
    remainingBalance: calculateRemainingBalance(
      totalMilkAmount,
      totalCredit,
      totalDebit,
    ),
  };
}

export function sortCombinedRecords(records: CombinedRecordRow[]) {
  return [...records].sort((left, right) => {
    if (left.date !== right.date) {
      return right.date.localeCompare(left.date);
    }

    return right.created_at.localeCompare(left.created_at);
  });
}

export function getCurrentCycleBalance(cycle: LedgerCycleComputed | null) {
  if (!cycle) {
    return 0;
  }

  return roundAmount(cycle.net_balance);
}
