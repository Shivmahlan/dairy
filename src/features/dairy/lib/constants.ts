import type { MilkShift, TransactionType } from "./types";

export const APP_NAME = "Dairy Management";
export const DASHBOARD_HOME = "/dashboard/milk-collection";
export const DEFAULT_MILK_RATE = 8.5;

export const SHIFT_OPTIONS: Array<{ label: string; value: MilkShift }> = [
  { label: "Morning", value: "morning" },
  { label: "Evening", value: "evening" },
];

export const TRANSACTION_TYPE_OPTIONS: Array<{
  label: string;
  value: TransactionType;
}> = [
  { label: "Credit", value: "credit" },
  { label: "Debit", value: "debit" },
];
