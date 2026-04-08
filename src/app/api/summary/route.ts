import { NextResponse } from 'next/server';
import { getSummary } from '@/lib/dairy';
import { handleApiError } from '@/lib/http';
import { getRequiredQuery } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = getRequiredQuery(searchParams, 'date', 'Date');
    return NextResponse.json(getSummary(date));
  } catch (error) {
    return handleApiError(error, 'Failed to fetch summary.');
  }
}
