import { NextResponse } from 'next/server';
import { getAllServiceTypes } from '@/lib/db';

export async function GET() {
  const types = await getAllServiceTypes();
  return NextResponse.json(types);
}
