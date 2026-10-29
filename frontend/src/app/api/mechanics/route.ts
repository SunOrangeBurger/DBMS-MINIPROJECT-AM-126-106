import { NextResponse } from 'next/server';
import { getAllMechanics } from '@/lib/db';

export async function GET() {
  const mechs = await getAllMechanics();
  return NextResponse.json(mechs);
}
