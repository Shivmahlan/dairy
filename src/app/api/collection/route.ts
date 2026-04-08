import { NextResponse } from 'next/server';
import { createCollection, listCollections } from '@/lib/dairy';
import { handleApiError } from '@/lib/http';
import { parseCollectionInput, readJson } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date')?.trim() || undefined;
    return NextResponse.json(listCollections(date));
  } catch (error) {
    return handleApiError(error, 'Failed to fetch collections.');
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const payload = parseCollectionInput(body);
    const entry = createCollection(payload);
    return NextResponse.json({ ...entry, success: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Failed to add collection entry.');
  }
}
