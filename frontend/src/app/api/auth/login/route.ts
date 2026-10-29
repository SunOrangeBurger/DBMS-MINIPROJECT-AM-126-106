import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Username/Email and password are required' }, { status: 400 });
    }

    const auth = await authenticateUser(identifier.trim(), password);

    if (!auth) {
      return NextResponse.json({ error: 'Invalid credentials. For Admin, use "Admin" / "Admin123"' }, { status: 401 });
    }

    const { user, customer, mechanic } = auth;
    return NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      customer,
      mechanic,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
