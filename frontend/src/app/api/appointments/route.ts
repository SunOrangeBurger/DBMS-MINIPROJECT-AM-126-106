import { NextResponse } from 'next/server';
import { getAllAppointments, bookAppointment } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const mechanicId = searchParams.get('mechanicId');
    const status = searchParams.get('status');

    let list = await getAllAppointments();

    if (customerId) {
      const cid = Number(customerId);
      list = list.filter((a) => a.vehicle?.customer_id === cid);
    }
    if (mechanicId) {
      const mid = Number(mechanicId);
      list = list.filter((a) => a.mechanics?.some((m) => m.mechanic.mechanic_id === mid));
    }
    if (status) {
      list = list.filter((a) => a.status === status);
    }

    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vehicle_id, service_type_id, scheduled_date, complaint_notes } = body;

    if (!vehicle_id || !service_type_id || !scheduled_date) {
      return NextResponse.json({ error: 'vehicle_id, service_type_id, and scheduled_date are required' }, { status: 400 });
    }

    const appt = await bookAppointment({
      vehicle_id: Number(vehicle_id),
      service_type_id: Number(service_type_id),
      scheduled_date,
      complaint_notes: complaint_notes || '',
    });

    return NextResponse.json(appt, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
