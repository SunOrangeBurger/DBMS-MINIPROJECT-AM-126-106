import { NextResponse } from 'next/server';
import { getViewRevenueByService } from '@/lib/db';

export async function GET() {
  const data = await getViewRevenueByService();
  return NextResponse.json(data);
}
