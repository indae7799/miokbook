/**
 * PRD Section 8, 12: 주문 취소.
 * 조건: status=paid AND shippingStatus=ready
 * ① 토스 환불 API ② 성공: stock += qty, status=cancelled_by_customer ③ 실패: throw PAYMENT_FAILED
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const TOSS_CANCEL_BASE = 'https://api.tosspayments.com/v1/payments';

interface CancelPayload {
  orderId: string;
  cancelReason?: string;
}

interface OrderItem {
  isbn: string;
  quantity: number;
}

function getSecretKey(): string {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) throw new HttpsError('failed-precondition', 'TOSS_NOT_CONFIGURED');
  return key;
}

async function callTossCancel(paymentKey: string, cancelReason: string): Promise<boolean> {
  const secret = getSecretKey();
  const auth = Buffer.from(`${secret}:`, 'utf8').toString('base64');
  const res = await fetch(`${TOSS_CANCEL_BASE}/${encodeURIComponent(paymentKey)}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ cancelReason: cancelReason || '고객 요청 취소' }),
  });
  return res.ok;
}

export const cancelOrder = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'UNAUTHORIZED');

    const data = request.data as CancelPayload | undefined;
    const orderId = data?.orderId;
    if (!orderId) throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');

    const db = getFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) throw new HttpsError('not-found', 'ORDER_NOT_FOUND');

    const orderData = orderSnap.data()!;
    if (orderData.userId !== auth.uid) throw new HttpsError('permission-denied', 'FORBIDDEN');
    if (orderData.status !== 'paid') throw new HttpsError('failed-precondition', 'ORDER_NOT_PAID');
    if (orderData.shippingStatus !== 'ready') throw new HttpsError('failed-precondition', 'SHIPPING_ALREADY_SENT');

    const paymentKey = orderData.paymentKey;
    if (!paymentKey) throw new HttpsError('failed-precondition', 'PAYMENT_KEY_MISSING');

    const cancelReason = String(data?.cancelReason ?? '고객 요청 취소').slice(0, 200);
    const cancelled = await callTossCancel(paymentKey, cancelReason);
    if (!cancelled) {
      throw new HttpsError('internal', 'PAYMENT_FAILED');
    }

    const items = (orderData.items ?? []) as OrderItem[];
    const now = new Date();

    await db.runTransaction(async (tx) => {
      tx.update(orderRef, { status: 'cancelled_by_customer', cancelledAt: now });
      for (const item of items) {
        const isbn = String(item.isbn);
        const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
        const invRef = db.collection('inventory').doc(isbn);
        const bookRef = db.collection('books').doc(isbn);
        const invSnap = await tx.get(invRef);
        const bookSnap = await tx.get(bookRef);
        const stock = invSnap.exists ? Number(invSnap.data()?.stock ?? 0) : 0;
        const salesCount = bookSnap.exists ? Number(bookSnap.data()?.salesCount ?? 0) : 0;
        tx.set(invRef, { isbn, stock: stock + qty, updatedAt: now }, { merge: true });
        if (bookSnap.exists) {
          tx.update(bookRef, { salesCount: Math.max(0, salesCount - qty), updatedAt: now });
        }
      }
    });

    return { data: { ok: true, orderId } };
  }
);
