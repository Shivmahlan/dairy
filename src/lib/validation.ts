import { ApiError } from '@/lib/http';
import type {
  DebitEntryInput,
  MemberFormInput,
  MilkCollectionInput,
  ProductRequestInput,
  ProductRequestStatus,
  ProductRequestUpdateInput,
  Shift,
} from '@/lib/types';
import { roundToCurrency } from '@/lib/utils';

type JsonRecord = Record<string, unknown>;

const shifts = ['Morning', 'Evening'] as const satisfies readonly Shift[];
const productRequestStatuses = ['Pending', 'Approved', 'Rejected', 'Fulfilled'] as const satisfies readonly ProductRequestStatus[];

export async function readJson(request: Request) {
  const body = (await request.json()) as unknown;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError('Invalid request body.');
  }

  return body as JsonRecord;
}

export function parseMemberInput(body: JsonRecord): MemberFormInput {
  return {
    member_code: getRequiredString(body, 'member_code', 'Member code', 20),
    name: getRequiredString(body, 'name', 'Name', 80),
    phone: getOptionalString(body, 'phone', 20),
    address: getOptionalString(body, 'address', 240),
    joined_date: getDateString(body, 'joined_date', 'Joined date'),
    notes: getOptionalString(body, 'notes', 500),
  };
}

export function parseCollectionInput(body: JsonRecord): MilkCollectionInput & { total_amount: number } {
  const weight = getPositiveNumber(body, 'weight', 'Weight');
  const rate = getPositiveNumber(body, 'rate', 'Rate');

  return {
    date: getDateString(body, 'date', 'Date'),
    shift: getEnumValue(body, 'shift', shifts, 'Shift'),
    member_id: getPositiveInteger(body, 'member_id', 'Member'),
    weight,
    fat_percentage: getPositiveNumber(body, 'fat_percentage', 'Fat percentage'),
    rate,
    total_amount: roundToCurrency(weight * rate),
  };
}

export function parseDebitInput(body: JsonRecord): DebitEntryInput {
  return {
    date: getDateString(body, 'date', 'Date'),
    member_id: getPositiveInteger(body, 'member_id', 'Member'),
    product_name: getRequiredString(body, 'product_name', 'Product name', 80),
    amount: getPositiveNumber(body, 'amount', 'Amount'),
  };
}

export function parseProductRequestInput(body: JsonRecord): ProductRequestInput {
  return {
    member_id: getPositiveInteger(body, 'member_id', 'Member'),
    product_name: getRequiredString(body, 'product_name', 'Product name', 80),
  };
}

export function parseProductRequestUpdateInput(body: JsonRecord): ProductRequestUpdateInput {
  return {
    id: getPositiveInteger(body, 'id', 'Request'),
    status: getEnumValue(body, 'status', productRequestStatuses, 'Status'),
    response_note: getOptionalString(body, 'response_note', 240),
  };
}

export function getRequiredQuery(searchParams: URLSearchParams, key: string, label: string) {
  const value = searchParams.get(key)?.trim();

  if (!value) {
    throw new ApiError(`${label} is required.`);
  }

  return value;
}

function getRequiredString(body: JsonRecord, key: string, label: string, maxLength: number) {
  const value = body[key];

  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(`${label} is required.`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new ApiError(`${label} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
}

function getOptionalString(body: JsonRecord, key: string, maxLength: number) {
  const value = body[key];

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ApiError('Invalid text value.');
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new ApiError(`Text must be ${maxLength} characters or fewer.`);
  }

  return normalized || null;
}

function getPositiveInteger(body: JsonRecord, key: string, label: string) {
  const rawValue = body[key];
  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);

  if (!Number.isInteger(value) || value <= 0) {
    throw new ApiError(`${label} is invalid.`);
  }

  return value;
}

function getPositiveNumber(body: JsonRecord, key: string, label: string) {
  const rawValue = body[key];
  const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);

  if (!Number.isFinite(value) || value <= 0) {
    throw new ApiError(`${label} must be greater than zero.`);
  }

  return roundToCurrency(value);
}

function getEnumValue<T extends readonly string[]>(body: JsonRecord, key: string, options: T, label: string) {
  const rawValue = body[key];

  if (typeof rawValue !== 'string' || !options.includes(rawValue)) {
    throw new ApiError(`${label} is invalid.`);
  }

  return rawValue as T[number];
}

function getDateString(body: JsonRecord, key: string, label: string) {
  const value = body[key];

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(`${label} must be in YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ApiError(`${label} is invalid.`);
  }

  return value;
}
