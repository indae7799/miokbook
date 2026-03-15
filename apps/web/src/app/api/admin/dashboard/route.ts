import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

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

    const todayStart = startOfToday();

    const ordersSnap = await adminDb
      .collection('orders')
      .where('status', '==', 'paid')
      .get();
    let todayOrderCount = 0;
    let todayRevenue = 0;
    ordersSnap.docs.forEach((doc) => {
      const d = doc.data();
      const paidAt = d.paidAt?.toDate?.();
      if (paidAt && paidAt >= todayStart) {
        todayOrderCount += 1;
        todayRevenue += (d.totalPrice ?? 0) + (d.shippingFee ?? 0);
      }
    });

    const recentSnap = await adminDb
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    const recentOrders = recentSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        orderId: d.orderId,
        status: d.status,
        totalPrice: d.totalPrice,
        shippingFee: d.shippingFee,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    const inventorySnap = await adminDb.collection('inventory').get();
    const lowStockList: { isbn: string; stock: number; title?: string }[] = [];
    for (const doc of inventorySnap.docs) {
      const d = doc.data();
      const stock = Number(d.stock ?? 0);
      if (stock < 5) {
        lowStockList.push({ isbn: doc.id, stock });
      }
    }
    for (let i = 0; i < lowStockList.length; i++) {
      const bookDoc = await adminDb.doc(`books/${lowStockList[i].isbn}`).get();
      if (bookDoc.exists) {
        lowStockList[i].title = bookDoc.data()?.title;
      }
    }

    return NextResponse.json({
      todayOrderCount,
      todayRevenue,
      lowStockBooks: lowStockList,
      recentOrders,
    });
  } catch (e) {
    console.error('[admin/dashboard]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
