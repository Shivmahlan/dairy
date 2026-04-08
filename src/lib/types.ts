export type Shift = 'Morning' | 'Evening';

export type ProductRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled';

export type Member = {
  id: number;
  member_code: string;
  name: string;
  phone: string | null;
  address: string | null;
  joined_date: string;
  notes: string | null;
};

export type MemberFormInput = {
  member_code: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  joined_date: string;
  notes?: string | null;
};

export type MemberOption = Pick<Member, 'id' | 'member_code' | 'name'>;

export type MilkCollection = {
  id: number;
  date: string;
  shift: Shift;
  member_id: number;
  weight: number;
  fat_percentage: number;
  rate: number;
  total_amount: number;
};

export type MilkCollectionWithMember = MilkCollection & {
  member_name: string;
  member_code: string;
};

export type MilkCollectionInput = {
  date: string;
  shift: Shift;
  member_id: number;
  weight: number;
  fat_percentage: number;
  rate: number;
};

export type DebitEntry = {
  id: number;
  date: string;
  member_id: number;
  product_name: string;
  amount: number;
};

export type DebitEntryWithMember = DebitEntry & {
  member_name: string;
  member_code: string;
};

export type DebitEntryInput = {
  date: string;
  member_id: number;
  product_name: string;
  amount: number;
};

export type ProductRequest = {
  id: number;
  member_id: number;
  product_name: string;
  status: ProductRequestStatus;
  requested_at: string;
  response_note: string | null;
  processed_at: string | null;
};

export type ProductRequestWithMember = ProductRequest & {
  member_name: string;
  member_code: string;
};

export type ProductRequestInput = {
  member_id: number;
  product_name: string;
};

export type ProductRequestUpdateInput = {
  id: number;
  status: ProductRequestStatus;
  response_note?: string | null;
};

export type MemberBalance = {
  id: number;
  member_code: string;
  name: string;
  total_credit: number;
  total_debit: number;
  balance: number;
};

export type SummaryMemberRow = {
  member_id: number;
  member_name: string;
  member_code: string;
  total_weight: number;
  total_amount: number;
};

export type ShiftSummary = {
  shift: Shift;
  total_weight: number;
  total_amount: number;
  entries: number;
};

export type SummaryData = {
  totals: {
    weight: number;
    amount: number;
    suppliers: number;
  };
  members: SummaryMemberRow[];
  shiftTotals: ShiftSummary[];
};

export type FinancialData = {
  balances: MemberBalance[];
  recentDebits: DebitEntryWithMember[];
  members: MemberOption[];
  productRequests: ProductRequestWithMember[];
};

export type TopSupplier = {
  member_id: number;
  member_name: string;
  member_code: string;
  total_weight: number;
  total_amount: number;
};

export type ReportData = {
  total_milk_purchased: number;
  total_payments: number;
  total_product_sales: number;
  net_balance: number;
  collection_days: number;
  average_daily_milk: number;
  top_suppliers: TopSupplier[];
};

export type AdminDashboardData = {
  date: string;
  stats: {
    totalMilkToday: number;
    totalAmountToday: number;
    activeSuppliersToday: number;
    totalMembers: number;
    pendingRequests: number;
    monthMilk: number;
    monthPayout: number;
  };
  recentCollections: MilkCollectionWithMember[];
  topBalances: MemberBalance[];
  pendingRequests: ProductRequestWithMember[];
};

export type MemberDashboardData = {
  member: Member;
  balance: number;
  totalCredit: number;
  totalDebit: number;
  milkEntries: MilkCollection[];
  deductions: DebitEntry[];
  productRequests: ProductRequest[];
};
