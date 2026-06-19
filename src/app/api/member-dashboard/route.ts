import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getMemberDashboard } from '@/lib/dairy';
import { handleApiError } from '@/lib/http';
import { verifySession } from '@/lib/session';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('member_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session || !session.memberCode) {
      return NextResponse.json({ error: 'Session expired or invalid. Please log in again.' }, { status: 401 });
    }

    return NextResponse.json(getMemberDashboard(session.memberCode));
  } catch (error) {
    return handleApiError(error, 'Failed to fetch member dashboard data.');
  }
}
