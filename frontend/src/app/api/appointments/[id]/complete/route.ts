import { NextResponse } from 'next/server';
import { completeAppointmentAndBill } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const completed = await completeAppointmentAndBill(Number(id));
    return NextResponse.json(completed);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
