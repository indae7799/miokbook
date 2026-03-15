import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function getCallableUrl(name: string): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = process.env.FIREBASE_FUNCTIONS_REGION ?? 'us-central1';
  if (!projectId) return null;
  return `https://${region}-${projectId}.cloudfunctions.net/${name}`;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    await adminAuth.verifyIdToken(idToken);

    const body = await request.json().catch(() => ({}));
    const items = body.items as Array<{ isbn: string; quantity: number }> | undefined;
    const shippingAddress = body.shippingAddress as Record<string, string> | undefined;
    if (!Array.isArray(items) || items.length === 0 || !shippingAddress) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const createOrderUrl = getCallableUrl('createOrder');
    if (!createOrderUrl) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const createRes = await fetch(createOrderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ data: { items, shippingAddress } }),
    });

    const createJson = await createRes.json().catch(() => ({}));
    if (!createRes.ok) {
      const err = createJson?.error?.message ?? createJson?.message ?? 'CREATE_ORDER_FAILED';
      return NextResponse.json({ error: err }, { status: 400 });
    }
    const result = createJson?.result ?? createJson?.result?.data ?? createJson?.data ?? createJson;
    const orderId = result?.orderId ?? result?.data?.orderId;
    if (!orderId) {
      return NextResponse.json({ error: 'CREATE_ORDER_FAILED' }, { status: 500 });
    }

    const reserveUrl = getCallableUrl('reserveStock');
    if (!reserveUrl) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const reserveRes = await fetch(reserveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({ data: { orderId } }),
    });

    const reserveJson = await reserveRes.json().catch(() => ({}));
    if (!reserveRes.ok) {
      const err = reserveJson?.error?.message ?? reserveJson?.message ?? 'RESERVE_FAILED';
      if (String(err).includes('STOCK_SHORTAGE')) {
        return NextResponse.json({ error: 'STOCK_SHORTAGE' }, { status: 409 });
      }
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const totalPrice = result?.totalPrice ?? result?.data?.totalPrice ?? 0;
    const shippingFee = result?.shippingFee ?? result?.data?.shippingFee ?? 0;
    const expiresAt = result?.expiresAt ?? result?.data?.expiresAt ?? null;

    return NextResponse.json({
      orderId,
      totalPrice,
      shippingFee,
      expiresAt,
    });
  } catch (e) {
    console.error('[api/order/create]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
