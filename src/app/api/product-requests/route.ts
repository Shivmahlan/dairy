import { NextResponse } from 'next/server';
import { createProductRequest, listProductRequests, updateProductRequest } from '@/lib/dairy';
import { handleApiError } from '@/lib/http';
import { parseProductRequestInput, parseProductRequestUpdateInput, readJson } from '@/lib/validation';

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
    const body = await readJson(request);
    const payload = parseProductRequestInput(body);
    const requestInfo = createProductRequest(payload.member_id, payload.product_name);
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
