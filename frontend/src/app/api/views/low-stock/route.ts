import { NextResponse } from 'next/server';
import { getViewLowStockParts } from '@/lib/db';

export async function GET() {
  const data = await getViewLowStockParts();
  return NextResponse.json(data);
}
