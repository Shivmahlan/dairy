import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import { signSession } from '@/lib/session';
import type { Member } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { memberCode, pin } = (await request.json()) as { memberCode?: string; pin?: string };

    if (!memberCode || !pin) {
      return NextResponse.json({ error: 'Member code and PIN are required.' }, { status: 400 });
    }

    const member = db
      .prepare('SELECT * FROM Members WHERE member_code = ?')
      .get(memberCode.trim()) as Member | undefined;

    if (!member) {
      return NextResponse.json({ error: 'Invalid member code or PIN.' }, { status: 401 });
    }

    const expectedPin = member.pin || '1234';
    if (pin.trim() !== expectedPin.trim()) {
      return NextResponse.json({ error: 'Invalid member code or PIN.' }, { status: 401 });
    }

    const token = signSession({
      memberId: member.id,
      memberCode: member.member_code,
    });

    const cookieStore = await cookies();
    cookieStore.set('member_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return NextResponse.json({
      success: true,
      member: {
        id: member.id,
        member_code: member.member_code,
        name: member.name,
      },
    });
  } catch (error) {
    console.error('Member login error:', error);
    return NextResponse.json({ error: 'Failed to authenticate member.' }, { status: 500 });
  }
}
