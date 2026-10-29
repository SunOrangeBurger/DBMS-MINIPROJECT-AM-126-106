import { NextResponse } from 'next/server';
import { getAllVehicles, addVehicle } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId');
  const vehicles = await getAllVehicles(customerId ? Number(customerId) : undefined);
  return NextResponse.json(vehicles);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customer_id, registration_no, make, model, year, fuel_type, odometer_km } = body;

    if (!customer_id || !registration_no || !make || !model || !year) {
      return NextResponse.json({ error: 'Missing required vehicle fields' }, { status: 400 });
    }

    const veh = await addVehicle({
      customer_id: Number(customer_id),
      registration_no: registration_no.trim(),
      make: make.trim(),
      model: model.trim(),
      year: Number(year),
      fuel_type: fuel_type || 'petrol',
      odometer_km: Number(odometer_km || 0),
    });

    return NextResponse.json(veh, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
