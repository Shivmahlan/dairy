import { NextResponse } from 'next/server';
import { createProductRequest, listProductRequests, updateProductRequest } from '@/lib/dairy';
import { handleApiError } from '@/lib/http';
import { parseProductRequestUpdateInput, readJson } from '@/lib/validation';

import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim();
    return NextResponse.json(listProductRequests(status as Parameters<typeof listProductRequests>[0]));
  } catch (error) {
    return handleApiError(error, 'Failed to fetch product requests.');
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('member_session')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session || !session.memberId) {
      return NextResponse.json({ error: 'Session expired or invalid. Please log in again.' }, { status: 401 });
    }

    const body = await readJson(request);
    const productName = body.product_name;
    if (typeof productName !== 'string' || !productName.trim()) {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    }

    const requestInfo = createProductRequest(session.memberId, productName.trim());
    return NextResponse.json({ ...requestInfo, success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to submit request.');
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson(request);
    updateProductRequest(parseProductRequestUpdateInput(body));
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Failed to update product request.');
  }
}
