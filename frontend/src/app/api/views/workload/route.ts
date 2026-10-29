import { NextResponse } from 'next/server';
import { getViewMechanicWorkload } from '@/lib/db';

export async function GET() {
  const data = await getViewMechanicWorkload();
  return NextResponse.json(data);
}
