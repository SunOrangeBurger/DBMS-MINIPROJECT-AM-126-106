import { NextResponse } from 'next/server';
import { getAppointmentById, updateAppointment, addPartToAppointment } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appt = await getAppointmentById(Number(id));
  if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  return NextResponse.json(appt);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateAppointment(Number(id), body);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// Add spare part to appointment
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { part_id, quantity } = body;

    if (!part_id || !quantity) {
      return NextResponse.json({ error: 'part_id and quantity are required' }, { status: 400 });
    }

    const updated = await addPartToAppointment(Number(id), Number(part_id), Number(quantity));
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
