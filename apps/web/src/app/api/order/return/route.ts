import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function getCallableUrl(name: string): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = process.env.FIREBASE_FUNCTIONS_REGION ?? 'us-central1';
  if (!projectId) return null;
  return `https://${region}-${projectId}.cloudfunctions.net/${name}`;
}

/** POST /api/order/return — 반품 신청 (paid + delivered + 수령 7일 이내) */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    await adminAuth.verifyIdToken(idToken);

    const body = await request.json().catch(() => ({}));
    const orderId = body.orderId as string | undefined;
    if (!orderId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const url = getCallableUrl('requestReturn');
    if (!url) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        data: { orderId, returnReason: body.returnReason },
      }),
    });

    const json = await res.json().catch(() => ({}));
    const result = json?.result ?? json?.result?.data ?? json?.data ?? json;

    if (result?.ok) {
      return NextResponse.json({ success: true, orderId });
    }

    const errMsg = json?.error?.message ?? json?.message ?? 'RETURN_REQUEST_FAILED';
    const status = res.ok ? 400 : res.status;
    return NextResponse.json({ error: errMsg }, { status });
  } catch (e) {
    console.error('[api/order/return]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
