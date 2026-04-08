import db from '@/lib/db';
import { ApiError } from '@/lib/http';
import type {
  AdminDashboardData,
  DebitEntryInput,
  FinancialData,
  Member,
  MemberDashboardData,
  MemberFormInput,
  MemberOption,
  MilkCollectionInput,
  MilkCollectionWithMember,
  ProductRequestStatus,
  ProductRequestUpdateInput,
  ProductRequestWithMember,
  ReportData,
  SummaryData,
} from '@/lib/types';
import { getLocalDateValue } from '@/lib/utils';

type TotalRow = { total: number | null };
type CountRow = { total: number };

export function listMembers() {
  return db
    .prepare(`
      SELECT id, member_code, name, phone, address, joined_date, notes
      FROM Members
      ORDER BY name COLLATE NOCASE ASC, id DESC
    `)
    .all() as Member[];
}

export function listMemberOptions() {
  return db
    .prepare(`
      SELECT id, member_code, name
      FROM Members
      ORDER BY name COLLATE NOCASE ASC
    `)
    .all() as MemberOption[];
}

export function createMember(input: MemberFormInput) {
  try {
    const result = db
      .prepare(`
        INSERT INTO Members (member_code, name, phone, address, joined_date, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.member_code,
        input.name,
        input.phone ?? null,
        input.address ?? null,
        input.joined_date,
        input.notes ?? null,
      );

    return getMemberById(Number(result.lastInsertRowid));
  } catch (error) {
    throw mapSqliteError(error, 'Member code must be unique.');
  }
}

export function updateMember(id: number, input: MemberFormInput) {
  try {
    const result = db
      .prepare(`
        UPDATE Members
        SET member_code = ?, name = ?, phone = ?, address = ?, joined_date = ?, notes = ?
        WHERE id = ?
      `)
      .run(
        input.member_code,
        input.name,
        input.phone ?? null,
        input.address ?? null,
        input.joined_date,
        input.notes ?? null,
        id,
      );

    if (result.changes === 0) {
      throw new ApiError('Member not found.', 404);
    }

    return getMemberById(id);
  } catch (error) {
    throw mapSqliteError(error, 'Member code must be unique.');
  }
}

export function deleteMember(id: number) {
  try {
    const result = db.prepare('DELETE FROM Members WHERE id = ?').run(id);

    if (result.changes === 0) {
      throw new ApiError('Member not found.', 404);
    }
  } catch (error) {
    throw mapForeignKeyError(error, 'This member already has related records and cannot be deleted.');
  }
}

export function listCollections(date?: string) {
  const query = `
    SELECT c.*, m.name AS member_name, m.member_code
    FROM Milk_Collection c
    JOIN Members m ON m.id = c.member_id
    ${date ? 'WHERE c.date = ?' : ''}
    ORDER BY c.date DESC, c.id DESC
  `;

  return (date ? db.prepare(query).all(date) : db.prepare(query).all()) as MilkCollectionWithMember[];
}

export function createCollection(input: MilkCollectionInput) {
  ensureMemberExists(input.member_id);

  const duplicateEntry = db
    .prepare('SELECT id FROM Milk_Collection WHERE date = ? AND shift = ? AND member_id = ?')
    .get(input.date, input.shift, input.member_id) as { id: number } | undefined;

  if (duplicateEntry) {
    throw new ApiError('This member already has a collection entry for the selected shift.', 409);
  }

  const totalAmount = Number((input.weight * input.rate).toFixed(2));

  const result = db
    .prepare(`
      INSERT INTO Milk_Collection (date, shift, member_id, weight, fat_percentage, rate, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.date,
      input.shift,
      input.member_id,
      input.weight,
      input.fat_percentage,
      input.rate,
      totalAmount,
    );

  return {
    id: Number(result.lastInsertRowid),
    total_amount: totalAmount,
  };
}

export function getSummary(date: string) {
  const totals = db
    .prepare(`
      SELECT
        COALESCE(SUM(weight), 0) AS total_weight,
        COALESCE(SUM(total_amount), 0) AS total_amount,
        COUNT(DISTINCT member_id) AS suppliers
      FROM Milk_Collection
      WHERE date = ?
    `)
    .get(date) as {
    total_weight: number;
    total_amount: number;
    suppliers: number;
  };

  const members = db
    .prepare(`
      SELECT
        c.member_id,
        m.name AS member_name,
        m.member_code,
        SUM(c.weight) AS total_weight,
        SUM(c.total_amount) AS total_amount
      FROM Milk_Collection c
      JOIN Members m ON m.id = c.member_id
      WHERE c.date = ?
      GROUP BY c.member_id, m.name, m.member_code
      ORDER BY total_amount DESC, m.name COLLATE NOCASE ASC
    `)
    .all(date) as SummaryData['members'];

  const shiftTotals = db
    .prepare(`
      SELECT
        shift,
        COALESCE(SUM(weight), 0) AS total_weight,
        COALESCE(SUM(total_amount), 0) AS total_amount,
        COUNT(*) AS entries
      FROM Milk_Collection
      WHERE date = ?
      GROUP BY shift
      ORDER BY CASE shift WHEN 'Morning' THEN 0 ELSE 1 END
    `)
    .all(date) as SummaryData['shiftTotals'];

  return {
    totals: {
      weight: totals.total_weight,
      amount: totals.total_amount,
      suppliers: totals.suppliers,
    },
    members,
    shiftTotals,
  } satisfies SummaryData;
}

export function getFinancialOverview() {
  const balances = db
    .prepare(`
      SELECT
        m.id,
        m.member_code,
        m.name,
        COALESCE(credit.total_credit, 0) AS total_credit,
        COALESCE(debit.total_debit, 0) AS total_debit,
        COALESCE(credit.total_credit, 0) - COALESCE(debit.total_debit, 0) AS balance
      FROM Members m
      LEFT JOIN (
        SELECT member_id, SUM(total_amount) AS total_credit
        FROM Milk_Collection
        GROUP BY member_id
      ) credit ON credit.member_id = m.id
      LEFT JOIN (
        SELECT member_id, SUM(amount) AS total_debit
        FROM Debit_Entries
        GROUP BY member_id
      ) debit ON debit.member_id = m.id
      ORDER BY m.name COLLATE NOCASE ASC
    `)
    .all() as FinancialData['balances'];

  const recentDebits = db
    .prepare(`
      SELECT d.*, m.name AS member_name, m.member_code
      FROM Debit_Entries d
      JOIN Members m ON m.id = d.member_id
      ORDER BY d.date DESC, d.id DESC
      LIMIT 50
    `)
    .all() as FinancialData['recentDebits'];

  return {
    balances,
    recentDebits,
    members: listMemberOptions(),
    productRequests: listProductRequests(),
  } satisfies FinancialData;
}

export function createDebitEntry(input: DebitEntryInput) {
  ensureMemberExists(input.member_id);

  const result = db
    .prepare(`
      INSERT INTO Debit_Entries (date, member_id, product_name, amount)
      VALUES (?, ?, ?, ?)
    `)
    .run(input.date, input.member_id, input.product_name, input.amount);

  return { id: Number(result.lastInsertRowid) };
}

export function getReport(fromDate: string, toDate: string) {
  const milkTotals = db
    .prepare(`
      SELECT
        COALESCE(SUM(weight), 0) AS total_weight,
        COALESCE(SUM(total_amount), 0) AS total_amount,
        COUNT(DISTINCT date) AS collection_days
      FROM Milk_Collection
      WHERE date >= ? AND date <= ?
    `)
    .get(fromDate, toDate) as {
    total_weight: number;
    total_amount: number;
    collection_days: number;
  };

  const debitTotals = db
    .prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total_deduction
      FROM Debit_Entries
      WHERE date >= ? AND date <= ?
    `)
    .get(fromDate, toDate) as { total_deduction: number };

  const topSuppliers = db
    .prepare(`
      SELECT
        c.member_id,
        m.name AS member_name,
        m.member_code,
        SUM(c.weight) AS total_weight,
        SUM(c.total_amount) AS total_amount
      FROM Milk_Collection c
      JOIN Members m ON m.id = c.member_id
      WHERE c.date >= ? AND c.date <= ?
      GROUP BY c.member_id, m.name, m.member_code
      ORDER BY total_amount DESC, total_weight DESC
      LIMIT 5
    `)
    .all(fromDate, toDate) as ReportData['top_suppliers'];

  const totalPayments = milkTotals.total_amount;
  const totalProductSales = debitTotals.total_deduction;

  return {
    total_milk_purchased: milkTotals.total_weight,
    total_payments: totalPayments,
    total_product_sales: totalProductSales,
    net_balance: totalPayments - totalProductSales,
    collection_days: milkTotals.collection_days,
    average_daily_milk: milkTotals.collection_days > 0 ? milkTotals.total_weight / milkTotals.collection_days : 0,
    top_suppliers: topSuppliers,
  } satisfies ReportData;
}

export function getMemberDashboard(memberCode: string) {
  const member = db
    .prepare('SELECT * FROM Members WHERE member_code = ?')
    .get(memberCode) as Member | undefined;

  if (!member) {
    throw new ApiError('Member not found.', 404);
  }

  const totalCredit =
    (db
      .prepare('SELECT COALESCE(SUM(total_amount), 0) AS total FROM Milk_Collection WHERE member_id = ?')
      .get(member.id) as TotalRow).total ?? 0;

  const totalDebit =
    (db
      .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM Debit_Entries WHERE member_id = ?')
      .get(member.id) as TotalRow).total ?? 0;

  return {
    member,
    balance: totalCredit - totalDebit,
    totalCredit,
    totalDebit,
    milkEntries: db
      .prepare('SELECT * FROM Milk_Collection WHERE member_id = ? ORDER BY date DESC, id DESC LIMIT 30')
      .all(member.id) as MemberDashboardData['milkEntries'],
    deductions: db
      .prepare('SELECT * FROM Debit_Entries WHERE member_id = ? ORDER BY date DESC, id DESC LIMIT 30')
      .all(member.id) as MemberDashboardData['deductions'],
    productRequests: db
      .prepare(`
        SELECT id, member_id, product_name, status, requested_at, response_note, processed_at
        FROM Product_Requests
        WHERE member_id = ?
        ORDER BY requested_at DESC, id DESC
        LIMIT 12
      `)
      .all(member.id) as MemberDashboardData['productRequests'],
  } satisfies MemberDashboardData;
}

export function listProductRequests(status?: ProductRequestStatus) {
  const query = `
    SELECT r.*, m.name AS member_name, m.member_code
    FROM Product_Requests r
    JOIN Members m ON m.id = r.member_id
    ${status ? 'WHERE r.status = ?' : ''}
    ORDER BY
      CASE r.status WHEN 'Pending' THEN 0 ELSE 1 END,
      r.requested_at DESC,
      r.id DESC
    LIMIT 50
  `;

  return (status ? db.prepare(query).all(status) : db.prepare(query).all()) as ProductRequestWithMember[];
}

export function createProductRequest(memberId: number, productName: string) {
  ensureMemberExists(memberId);

  const result = db
    .prepare(`
      INSERT INTO Product_Requests (member_id, product_name, status, requested_at, response_note, processed_at)
      VALUES (?, ?, 'Pending', ?, NULL, NULL)
    `)
    .run(memberId, productName, new Date().toISOString());

  return { id: Number(result.lastInsertRowid) };
}

export function updateProductRequest(input: ProductRequestUpdateInput) {
  const existingRequest = db.prepare('SELECT id FROM Product_Requests WHERE id = ?').get(input.id) as { id: number } | undefined;

  if (!existingRequest) {
    throw new ApiError('Product request not found.', 404);
  }

  const processedAt = input.status === 'Pending' ? null : new Date().toISOString();

  db.prepare(`
      UPDATE Product_Requests
      SET status = ?, response_note = ?, processed_at = ?
      WHERE id = ?
    `)
    .run(input.status, input.response_note ?? null, processedAt, input.id);
}

export function getAdminDashboardData(date = getLocalDateValue()) {
  const monthStart = `${date.slice(0, 8)}01`;

  const stats = db
    .prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN date = @today THEN weight END), 0) AS totalMilkToday,
        COALESCE(SUM(CASE WHEN date = @today THEN total_amount END), 0) AS totalAmountToday,
        COUNT(DISTINCT CASE WHEN date = @today THEN member_id END) AS activeSuppliersToday,
        COALESCE(SUM(CASE WHEN date >= @monthStart THEN weight END), 0) AS monthMilk,
        COALESCE(SUM(CASE WHEN date >= @monthStart THEN total_amount END), 0) AS monthPayout
      FROM Milk_Collection
    `)
    .get({ today: date, monthStart }) as Omit<AdminDashboardData['stats'], 'totalMembers' | 'pendingRequests'>;

  const totalMembers = (db.prepare('SELECT COUNT(*) AS total FROM Members').get() as CountRow).total;
  const pendingRequests = (db
    .prepare("SELECT COUNT(*) AS total FROM Product_Requests WHERE status = 'Pending'")
    .get() as CountRow).total;

  const recentCollections = db
    .prepare(`
      SELECT c.*, m.name AS member_name, m.member_code
      FROM Milk_Collection c
      JOIN Members m ON m.id = c.member_id
      ORDER BY c.date DESC, c.id DESC
      LIMIT 8
    `)
    .all() as AdminDashboardData['recentCollections'];

  const topBalances = db
    .prepare(`
      SELECT
        m.id,
        m.member_code,
        m.name,
        COALESCE(credit.total_credit, 0) AS total_credit,
        COALESCE(debit.total_debit, 0) AS total_debit,
        COALESCE(credit.total_credit, 0) - COALESCE(debit.total_debit, 0) AS balance
      FROM Members m
      LEFT JOIN (
        SELECT member_id, SUM(total_amount) AS total_credit
        FROM Milk_Collection
        GROUP BY member_id
      ) credit ON credit.member_id = m.id
      LEFT JOIN (
        SELECT member_id, SUM(amount) AS total_debit
        FROM Debit_Entries
        GROUP BY member_id
      ) debit ON debit.member_id = m.id
      ORDER BY balance DESC, m.name COLLATE NOCASE ASC
      LIMIT 5
    `)
    .all() as AdminDashboardData['topBalances'];

  return {
    date,
    stats: {
      ...stats,
      totalMembers,
      pendingRequests,
    },
    recentCollections,
    topBalances,
    pendingRequests: listProductRequests('Pending').slice(0, 6),
  } satisfies AdminDashboardData;
}

function getMemberById(id: number) {
  const member = db.prepare('SELECT * FROM Members WHERE id = ?').get(id) as Member | undefined;

  if (!member) {
    throw new ApiError('Member not found.', 404);
  }

  return member;
}

function mapSqliteError(error: unknown, message: string) {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'SQLITE_CONSTRAINT_UNIQUE'
  ) {
    return new ApiError(message, 409);
  }

  return error instanceof Error ? error : new Error('Unknown database error');
}

function mapForeignKeyError(error: unknown, message: string) {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY'
  ) {
    return new ApiError(message, 409);
  }

  return error instanceof Error ? error : new Error('Unknown database error');
}

function ensureMemberExists(memberId: number) {
  const member = db.prepare('SELECT id FROM Members WHERE id = ?').get(memberId) as { id: number } | undefined;

  if (!member) {
    throw new ApiError('Member not found.', 404);
  }
}
