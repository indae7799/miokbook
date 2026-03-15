import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const SHIPPING_STATUSES = ['ready', 'shipped', 'delivered'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const docRef = adminDb.collection('orders').doc(orderId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const shippingStatus = body.shippingStatus as string | undefined;
    const returnCompleted = body.returnStatus === 'completed';

    const updates: Record<string, unknown> = {};
    const data = snap.data()!;

    if (shippingStatus && SHIPPING_STATUSES.includes(shippingStatus as (typeof SHIPPING_STATUSES)[number])) {
      updates.shippingStatus = shippingStatus;
      if (shippingStatus === 'delivered') {
        updates.deliveredAt = new Date();
      }
    }
    if (returnCompleted && data.returnStatus === 'requested') {
      updates.returnStatus = 'completed';
      updates.status = 'return_completed';
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    await docRef.update(updates);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/orders PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
