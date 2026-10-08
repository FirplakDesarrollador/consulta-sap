import { NextResponse } from 'next/server';
import { getSapSession } from '@/lib/sapClient';

export async function GET() {
  const startTime = Date.now();
  try {
    const session = await getSapSession();
    const latency = Date.now() - startTime;

    return NextResponse.json({
      connected: true,
      companyDB: process.env.SAP_COMPANY_DB || 'Firplak_SA',
      user: process.env.SAP_USERNAME || 'manager',
      serverUrl: process.env.SAP_BASE_URL || 'https://200.7.96.194:50000/b1s/v1',
      version: session.version,
      sessionId: session.sessionId.slice(0, 8) + '***',
      sessionTimeout: session.sessionTimeout,
      latencyMs: latency,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    const latency = Date.now() - startTime;
    return NextResponse.json({
      connected: false,
      companyDB: process.env.SAP_COMPANY_DB || 'Firplak_SA',
      user: process.env.SAP_USERNAME || 'manager',
      serverUrl: process.env.SAP_BASE_URL || 'https://200.7.96.194:50000/b1s/v1',
      latencyMs: latency,
      error: err.message || 'No se pudo conectar con el Service Layer de SAP',
      timestamp: new Date().toISOString()
    });
  }
}
