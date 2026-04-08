import { NextResponse } from 'next/server';
import { getReport } from '@/lib/dairy';
import { handleApiError } from '@/lib/http';
import { getRequiredQuery } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = getRequiredQuery(searchParams, 'from', 'From date');
    const toDate = getRequiredQuery(searchParams, 'to', 'To date');

    if (fromDate > toDate) {
      return NextResponse.json({ error: 'From date must be earlier than or equal to the to date.' }, { status: 400 });
    }

    return NextResponse.json(getReport(fromDate, toDate));
  } catch (error) {
    return handleApiError(error, 'Failed to generate report.');
  }
}
