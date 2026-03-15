import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** 로그인한 사용자 본인 주문 목록 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const snapshot = await adminDb
      .collection('orders')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const list = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        orderId: d.orderId,
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

    return NextResponse.json(list);
  } catch (e) {
    console.error('[api/orders GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
