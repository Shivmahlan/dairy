import { NextResponse } from 'next/server';
import { createDebitEntry, getFinancialOverview } from '@/lib/dairy';
import { handleApiError } from '@/lib/http';
import { parseDebitInput, readJson } from '@/lib/validation';

export async function GET() {
  try {
    return NextResponse.json(getFinancialOverview());
  } catch (error) {
    return handleApiError(error, 'Failed to fetch financials.');
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const entry = createDebitEntry(parseDebitInput(body));
    return NextResponse.json({ ...entry, success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to add debit entry.');
  }
}
