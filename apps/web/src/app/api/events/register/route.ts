import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

function getCallableUrl(name: string): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = process.env.FIREBASE_FUNCTIONS_REGION ?? 'us-central1';
  if (!projectId) return null;
  return `https://${region}-${projectId}.cloudfunctions.net/${name}`;
}

/** POST /api/events/register — 이벤트 신청 (PRD Section 14) */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    await adminAuth.verifyIdToken(idToken);

    const body = await request.json().catch(() => ({}));
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    if (!eventId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const url = getCallableUrl('registerEvent');
    if (!url) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({ data: { eventId } }),
    });

    const json = await res.json().catch(() => ({}));
    const payload = json?.result?.data ?? json?.result ?? json?.data ?? json;

    if (payload?.success) {
      return NextResponse.json({ success: true, registrationId: payload.registrationId });
    }

    const errMsg = json?.error?.message ?? json?.message ?? 'REGISTER_FAILED';
    if (String(errMsg).includes('EVENT_FULL')) {
      return NextResponse.json({ error: 'EVENT_FULL' }, { status: 409 });
    }
    if (String(errMsg).includes('ALREADY_REGISTERED')) {
      return NextResponse.json({ error: 'ALREADY_REGISTERED' }, { status: 409 });
    }
    const status = res.ok ? 400 : res.status;
    return NextResponse.json({ error: errMsg }, { status });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
