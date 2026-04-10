import { calculateTotalAmount } from "./calculations";
import type {
  ItemTransactionRow,
  MilkEntryRow,
  TransactionRow,
  TransactionType,
} from "./types";

type ImportRecordKind = "milk" | "payment" | "item";

interface RecordsCsvImportContext {
  businessId: string;
  milkRate: number;
  userId: string;
  userEmail: string;
}

export interface ParsedRecordsCsvImport {
  milkEntries: Array<
    Pick<
      MilkEntryRow,
      | "business_id"
      | "created_by_user_id"
      | "created_by_email"
      | "date"
      | "shift"
      | "weight"
      | "fat"
      | "total_amount"
    >
  >;
  transactions: Array<
    Pick<
      TransactionRow,
      | "business_id"
      | "created_by_user_id"
      | "created_by_email"
      | "date"
      | "type"
      | "amount"
      | "note"
    >
  >;
  itemTransactions: Array<
    Pick<
      ItemTransactionRow,
      | "business_id"
      | "created_by_user_id"
      | "created_by_email"
      | "date"
      | "shift"
      | "item_name"
      | "type"
      | "amount"
      | "note"
    >
  >;
  totalRows: number;
}

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function parseCsvContent(content: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (character === "," && !insideQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      currentCell = "";

      if (currentRow.some((cell) => cell.trim() !== "")) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell);

  if (currentRow.some((cell) => cell.trim() !== "")) {
    rows.push(currentRow);
  }

  return rows;
}

function getHeaderValue(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined) {
      return row[key];
    }
  }

  return "";
}

function parseNumber(value: string, fieldLabel: string, rowNumber: number) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`Row ${rowNumber}: ${fieldLabel} must be a valid number.`);
  }

  if (parsedValue < 0) {
    throw new Error(`Row ${rowNumber}: ${fieldLabel} cannot be negative.`);
  }

  return parsedValue;
}

function parseDate(value: string, rowNumber: number) {
  const normalizedValue = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    throw new Error(`Row ${rowNumber}: Date must use YYYY-MM-DD format.`);
  }

  const [year, month, day] = normalizedValue.split("-").map(Number);
  const parsedDate = new Date(`${normalizedValue}T00:00:00`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() + 1 !== month ||
    parsedDate.getDate() !== day
  ) {
    throw new Error(`Row ${rowNumber}: Date is invalid.`);
  }

  return normalizedValue;
}

function parseShift(value: string, rowNumber: number) {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue !== "morning" && normalizedValue !== "evening") {
    throw new Error(`Row ${rowNumber}: Shift must be morning or evening.`);
  }

  return normalizedValue;
}

function parseTransactionType(value: string, rowNumber: number): TransactionType {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue !== "credit" && normalizedValue !== "debit") {
    throw new Error(`Row ${rowNumber}: Type must be credit or debit.`);
  }

  return normalizedValue;
}

function parseRecordKind(value: string, rowNumber: number): ImportRecordKind {
  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "milk") {
    return "milk";
  }

  if (normalizedValue === "payment" || normalizedValue === "transaction") {
    return "payment";
  }

  if (normalizedValue === "item") {
    return "item";
  }

  throw new Error(
    `Row ${rowNumber}: Record kind must be milk, payment, transaction, or item.`,
  );
}

export function parseRecordsCsvImport(
  content: string,
  context: RecordsCsvImportContext,
): ParsedRecordsCsvImport {
  const rows = parseCsvContent(content);

  if (!rows.length) {
    throw new Error("The CSV file is empty.");
  }

  const [headerRow, ...dataRows] = rows;
  const normalizedHeaders = headerRow.map((header) => normalizeHeader(header));

  if (
    !normalizedHeaders.includes("record_kind") &&
    !normalizedHeaders.includes("entry_type") &&
    !normalizedHeaders.includes("kind")
  ) {
    throw new Error(
      'The CSV file must include a "record_kind" column.',
    );
  }

  if (!normalizedHeaders.includes("date")) {
    throw new Error('The CSV file must include a "date" column.');
  }

  const milkEntries: ParsedRecordsCsvImport["milkEntries"] = [];
  const transactions: ParsedRecordsCsvImport["transactions"] = [];
  const itemTransactions: ParsedRecordsCsvImport["itemTransactions"] = [];

  dataRows.forEach((rowValues, index) => {
    const rowNumber = index + 2;
    const normalizedRow = normalizedHeaders.reduce<Record<string, string>>(
      (row, header, headerIndex) => {
        row[header] = rowValues[headerIndex]?.trim() ?? "";
        return row;
      },
      {},
    );

    if (Object.values(normalizedRow).every((value) => value === "")) {
      return;
    }

    const recordKind = parseRecordKind(
      getHeaderValue(normalizedRow, "record_kind", "entry_type", "kind"),
      rowNumber,
    );
    const date = parseDate(getHeaderValue(normalizedRow, "date"), rowNumber);

    if (recordKind === "milk") {
      const shift = parseShift(getHeaderValue(normalizedRow, "shift"), rowNumber);
      const weight = parseNumber(
        getHeaderValue(normalizedRow, "weight"),
        "Weight",
        rowNumber,
      );
      const fat = parseNumber(
        getHeaderValue(normalizedRow, "fat"),
        "Fat",
        rowNumber,
      );

      milkEntries.push({
        business_id: context.businessId,
        created_by_user_id: context.userId,
        created_by_email: context.userEmail,
        date,
        shift,
        weight,
        fat,
        total_amount: calculateTotalAmount(weight, fat, context.milkRate),
      });
      return;
    }

    if (recordKind === "payment") {
      const type = parseTransactionType(
        getHeaderValue(normalizedRow, "type"),
        rowNumber,
      );
      const amount = parseNumber(
        getHeaderValue(normalizedRow, "amount"),
        "Amount",
        rowNumber,
      );

      transactions.push({
        business_id: context.businessId,
        created_by_user_id: context.userId,
        created_by_email: context.userEmail,
        date,
        type,
        amount,
        note: getHeaderValue(normalizedRow, "note") || null,
      });
      return;
    }

    const shift = parseShift(getHeaderValue(normalizedRow, "shift"), rowNumber);
    const itemName = getHeaderValue(normalizedRow, "item_name", "item");

    if (!itemName.trim()) {
      throw new Error(`Row ${rowNumber}: Item rows require an item_name value.`);
    }

    const type = parseTransactionType(
      getHeaderValue(normalizedRow, "type"),
      rowNumber,
    );
    const amount = parseNumber(
      getHeaderValue(normalizedRow, "amount"),
      "Amount",
      rowNumber,
    );

    itemTransactions.push({
      business_id: context.businessId,
      created_by_user_id: context.userId,
      created_by_email: context.userEmail,
      date,
      shift,
      item_name: itemName.trim(),
      type,
      amount,
      note: getHeaderValue(normalizedRow, "note") || null,
    });
  });

  const totalRows =
    milkEntries.length + transactions.length + itemTransactions.length;

  if (!totalRows) {
    throw new Error("The CSV file does not contain any importable rows.");
  }

  return {
    milkEntries,
    transactions,
    itemTransactions,
    totalRows,
  };
}
