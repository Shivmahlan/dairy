import { NextResponse } from 'next/server';
import { getMemberDashboard } from '@/lib/dairy';
import { handleApiError } from '@/lib/http';
import { getRequiredQuery } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = getRequiredQuery(searchParams, 'code', 'Member code');
    return NextResponse.json(getMemberDashboard(code));
  } catch (error) {
    return handleApiError(error, 'Failed to fetch member dashboard data.');
  }
}
