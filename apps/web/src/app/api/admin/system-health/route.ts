import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  getStoredSystemHealthState,
  runSystemHealthCheck,
  saveSystemHealthReport,
} from '@/lib/system-health';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: Request) {
  const idToken = request.headers.get('authorization')?.startsWith('Bearer ')
    ? request.headers.get('authorization')!.slice(7)
    : null;
  if (!idToken || !adminAuth) return { ok: false as const, status: 401 };
  const decoded = await adminAuth.verifyIdToken(idToken);
  if ((decoded as { role?: string }).role !== 'admin') return { ok: false as const, status: 403 };
  return { ok: true as const };
}

export async function GET(request: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

    const auth = await verifyAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status: auth.status });
    }

    const state = await getStoredSystemHealthState();
    return NextResponse.json(state);
  } catch (error) {
    console.error('[admin/system-health GET]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

    const auth = await verifyAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status: auth.status });
    }

    const report = await runSystemHealthCheck('manual');
    const state = await saveSystemHealthReport(report);
    return NextResponse.json(state);
  } catch (error) {
    console.error('[admin/system-health POST]', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
