import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUS = ['pending', 'paid', 'cancelled', 'failed', 'cancelled_by_customer', 'return_requested', 'return_completed'];

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') ?? '';

    const snapshot = await adminDb
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    let list = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        orderId: d.orderId,
        userId: d.userId,
        status: d.status,
        shippingStatus: d.shippingStatus,
        items: d.items ?? [],
        totalPrice: d.totalPrice,
        shippingFee: d.shippingFee,
        shippingAddress: d.shippingAddress,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? null,
        paidAt: d.paidAt?.toDate?.()?.toISOString?.() ?? null,
        deliveredAt: d.deliveredAt?.toDate?.()?.toISOString?.() ?? null,
        returnStatus: d.returnStatus ?? 'none',
        returnReason: d.returnReason ?? null,
      };
    });

    if (statusFilter && ALLOWED_STATUS.includes(statusFilter)) {
      list = list.filter((o) => o.status === statusFilter);
    }

    return NextResponse.json(list);
  } catch (e) {
    console.error('[admin/orders GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
