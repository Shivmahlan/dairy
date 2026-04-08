import { NextResponse } from 'next/server';
import { deleteMember, updateMember } from '@/lib/dairy';
import { ApiError, handleApiError } from '@/lib/http';
import { parseMemberInput, readJson } from '@/lib/validation';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const memberId = Number(id);

    if (!Number.isInteger(memberId) || memberId <= 0) {
      throw new ApiError('Member id is invalid.');
    }

    deleteMember(memberId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to delete member.');
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const memberId = Number(id);

    if (!Number.isInteger(memberId) || memberId <= 0) {
      throw new ApiError('Member id is invalid.');
    }

    const body = await readJson(request);
    const member = updateMember(memberId, parseMemberInput(body));
    return NextResponse.json({ member, success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to update member.');
  }
}
