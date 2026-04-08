import type {
  BalanceTone,
  CombinedRecordRow,
  LedgerCycleStatus,
  MilkShift,
  TransactionType,
} from "./types";

export function formatAmount(value: number) {
  return value.toFixed(2);
}

export function formatShiftLabel(shift: MilkShift | null) {
  if (!shift) {
    return "-";
  }

  return shift === "morning" ? "Morning" : "Evening";
}

export function formatTransactionType(
  type: CombinedRecordRow["type"] | TransactionType,
) {
  if (type === "milk") {
    return "Milk";
  }

  return type === "credit" ? "Credit" : "Debit";
}

export function buildMilkNote(shift: MilkShift) {
  return `${formatShiftLabel(shift)} milk collection`;
}

export function buildItemTransactionNote(itemName: string, note: string | null) {
  if (!note?.trim()) {
    return itemName;
  }

  return `${itemName} - ${note.trim()}`;
}

export function formatLedgerStatus(status: LedgerCycleStatus) {
  return status === "closed" ? "Closed" : "Open";
}

export function getBalanceTone(balance: number) {
  if (Math.abs(balance) < 0.01) {
    return {
      tone: "yellow" as BalanceTone,
      label: "Balanced",
    };
  }

  if (balance < 0) {
    return {
      tone: "green" as BalanceTone,
      label: "Vendor owes you",
    };
  }

  return {
    tone: "red" as BalanceTone,
    label: "You owe vendor",
  };
}
