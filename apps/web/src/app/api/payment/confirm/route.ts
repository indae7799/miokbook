import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function getCallableUrl(name: string): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = process.env.FIREBASE_FUNCTIONS_REGION ?? 'us-central1';
  if (!projectId) return null;
  return `https://${region}-${projectId}.cloudfunctions.net/${name}`;
}

/** POST /api/payment/confirm — 결제 승인 후 서버 확정 (confirmPayment CF 호출) */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    await adminAuth.verifyIdToken(idToken);

    const body = await request.json().catch(() => ({}));
    const paymentKey = body.paymentKey as string | undefined;
    const orderId = body.orderId as string | undefined;
    if (!paymentKey || !orderId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const url = getCallableUrl('confirmPayment');
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
        data: { paymentKey, orderId },
      }),
    });

    const json = await res.json().catch(() => ({}));
    const result = json?.result ?? json?.result?.data ?? json?.data ?? json;

    if (result?.alreadyProcessed) {
      return NextResponse.json({ success: true, orderId, alreadyProcessed: true, status: result.status });
    }
    if (result?.success === true) {
      return NextResponse.json({ success: true, orderId });
    }
    if (result?.success === false) {
      return NextResponse.json({ error: result.reason ?? 'PAYMENT_FAILED' }, { status: 400 });
    }

    const errMsg = json?.error?.message ?? json?.message ?? 'CONFIRM_FAILED';
    const status = res.ok ? 400 : res.status;
    return NextResponse.json({ error: errMsg }, { status });
  } catch (e) {
    console.error('[api/payment/confirm]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
