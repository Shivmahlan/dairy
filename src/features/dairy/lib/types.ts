export type MilkShift = "morning" | "evening";
export type TransactionType = "credit" | "debit";
export type LedgerCycleStatus = "open" | "closed";
export type BalanceTone = "green" | "red" | "yellow";
export type BusinessRole = "owner" | "member";

export interface BusinessContext {
  userId: string;
  userEmail: string;
  businessId: string;
  businessName: string;
  milkRate: number;
  role: BusinessRole;
}

export interface MilkEntryRow {
  id: string;
  business_id: string;
  created_by_user_id: string;
  created_by_email: string;
  date: string;
  shift: MilkShift;
  weight: number;
  fat: number;
  total_amount: number;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  business_id: string;
  created_by_user_id: string;
  created_by_email: string;
  date: string;
  type: TransactionType;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface ItemTransactionRow {
  id: string;
  business_id: string;
  created_by_user_id: string;
  created_by_email: string;
  date: string;
  shift: MilkShift;
  item_name: string;
  type: TransactionType;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface CombinedRecordRow {
  id: string;
  date: string;
  entry_type: "milk" | "payment" | "item";
  type: "milk" | TransactionType;
  created_by_user_id: string;
  created_by_email: string;
  shift: MilkShift | null;
  amount: number;
  item_name: string | null;
  note: string;
  created_at: string;
}

export interface RecordsSummary {
  totalMilkAmount: number;
  totalCredit: number;
  totalDebit: number;
  remainingBalance: number;
}

export interface RecordGroup {
  createdByEmail: string;
  records: CombinedRecordRow[];
  summary: RecordsSummary;
}

export interface AlertState {
  tone: "success" | "error" | "warning";
  message: string;
}

export interface LoginFormState {
  error: string | null;
}

export interface MilkEntryInput {
  date: string;
  shift: MilkShift;
  weight: string;
  fat: string;
}

export interface TransactionInput {
  date: string;
  type: TransactionType;
  amount: string;
  note: string;
}

export interface ItemTransactionInput {
  date: string;
  shift: MilkShift;
  itemName: string;
  type: TransactionType;
  amount: string;
  note: string;
}

export interface LedgerCycleRow {
  id: string;
  business_id: string;
  start_date: string;
  end_date: string;
  total_milk_amount: number;
  total_credit: number;
  total_debit: number;
  net_balance: number;
  carry_forward: number;
  status: LedgerCycleStatus;
  created_at: string;
}

export interface LedgerCycleComputed extends LedgerCycleRow {
  cycle_number: 1 | 2 | 3;
  label: string;
  final_balance: number;
  can_close: boolean;
  is_current: boolean;
}

export interface LedgerOverviewData {
  cycles: LedgerCycleComputed[];
  currentCycle: LedgerCycleComputed | null;
  currentCycleBalance: number;
  totalOutstandingBalance: number;
  tone: BalanceTone;
  statusText: string;
}

export interface LedgerCycleDetailData {
  cycle: LedgerCycleComputed;
  milkEntries: MilkEntryRow[];
  itemTransactions: ItemTransactionRow[];
  payments: TransactionRow[];
}

export interface CycleLockState {
  isLocked: boolean;
  cycleLabel: string;
  status: LedgerCycleStatus;
}
