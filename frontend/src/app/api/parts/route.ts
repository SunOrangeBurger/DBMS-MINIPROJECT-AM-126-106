import { NextResponse } from 'next/server';
import { getAllSpareParts, restockPart } from '@/lib/db';

export async function GET() {
  const parts = await getAllSpareParts();
  return NextResponse.json(parts);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { part_id, amount } = body;
    if (!part_id || !amount) {
      return NextResponse.json({ error: 'part_id and amount are required' }, { status: 400 });
    }
    const updated = await restockPart(Number(part_id), Number(amount));
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
