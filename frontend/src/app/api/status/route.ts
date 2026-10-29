import { NextResponse } from 'next/server';
import { getDbStatus } from '@/lib/db';

export async function GET() {
  const dbStatus = await getDbStatus();
  return NextResponse.json({
    status: 'online',
    appName: process.env.NEXT_PUBLIC_APP_NAME || 'AutoCare Workshop Management',
    hostIp: process.env.NEXT_PUBLIC_HOST_IP || '10.1.25.99',
    port: process.env.PORT || 3000,
    database: dbStatus,
  });
}
