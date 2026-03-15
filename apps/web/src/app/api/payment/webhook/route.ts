import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** 토스 PAYMENT_STATUS_CHANGED 웹훅: EXPIRED/ABORTED/CANCELED 시 재고 복원 및 주문 상태 업데이트. 항상 200 반환. */
export async function POST(request: Request) {
  try {
    const secret = process.env.TOSS_WEBHOOK_SECRET;
    if (secret) {
      const headerSecret = request.headers.get('x-tosspayments-webhook-secret')
        ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (headerSecret !== secret) {
        console.warn('[payment/webhook] Secret mismatch');
        return NextResponse.json({ received: true }, { status: 200 });
      }
    }

    const body = await request.json().catch(() => null);
    if (!body || body.eventType !== 'PAYMENT_STATUS_CHANGED') {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const data = body.data as { orderId?: string; paymentKey?: string; status?: string };
    const orderId = data?.orderId;
    const status = data?.status;

    if (!orderId || !status) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const releaseStatuses = ['EXPIRED', 'ABORTED'];
    const cancelStatuses = ['CANCELED', 'PARTIAL_CANCELED'];
    if (!releaseStatuses.includes(status) && !cancelStatuses.includes(status)) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (!adminDb) {
      console.error('[payment/webhook] adminDb not configured');
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const orderData = orderSnap.data()!;
    const items = (orderData.items ?? []) as Array<{ isbn: string; quantity: number }>;
    if (items.length === 0) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const newStatus = status === 'CANCELED' || status === 'PARTIAL_CANCELED' ? 'cancelled' : status === 'EXPIRED' ? 'cancelled' : 'failed';

    await adminDb.runTransaction(async (tx) => {
      const now = new Date();
      if (status === 'CANCELED' || status === 'PARTIAL_CANCELED') {
        for (const item of items) {
          const isbn = String(item.isbn);
          const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
          const invRef = adminDb!.collection('inventory').doc(isbn);
          const bookRef = adminDb!.collection('books').doc(isbn);
          const invSnap = await tx.get(invRef);
          const bookSnap = await tx.get(bookRef);
          const stock = invSnap.exists ? Number(invSnap.data()?.stock ?? 0) : 0;
          const salesCount = bookSnap.exists ? Number(bookSnap.data()?.salesCount ?? 0) : 0;
          tx.set(invRef, { isbn, stock: stock + qty, updatedAt: now }, { merge: true });
          if (bookSnap.exists) {
            tx.update(bookRef, { salesCount: Math.max(0, salesCount - qty), updatedAt: now });
          }
        }
      } else {
        for (const item of items) {
          const isbn = String(item.isbn);
          const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
          const invRef = adminDb!.collection('inventory').doc(isbn);
          const invSnap = await tx.get(invRef);
          const reserved = invSnap.exists ? Number(invSnap.data()?.reserved ?? 0) : 0;
          tx.set(invRef, { isbn, reserved: Math.max(0, reserved - qty), updatedAt: now }, { merge: true });
        }
      }
      tx.update(orderRef, { status: newStatus, cancelledAt: now });
    });
  } catch (e) {
    console.error('[payment/webhook]', e);
  }
  return NextResponse.json({ received: true }, { status: 200 });
}
