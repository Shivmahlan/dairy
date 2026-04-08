import { NextResponse } from 'next/server';
import { createMember, listMembers } from '@/lib/dairy';
import { handleApiError } from '@/lib/http';
import { parseMemberInput, readJson } from '@/lib/validation';

export async function GET() {
  try {
    return NextResponse.json(listMembers());
  } catch (error) {
    return handleApiError(error, 'Failed to fetch members.');
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const member = createMember(parseMemberInput(body));
    return NextResponse.json({ member, success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to create member.');
  }
}
