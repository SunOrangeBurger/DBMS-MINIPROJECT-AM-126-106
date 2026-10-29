import { NextResponse } from 'next/server';
import { getViewServiceHistory } from '@/lib/db';

export async function GET() {
  const data = await getViewServiceHistory();
  return NextResponse.json(data);
}
