/**
 * PRD Section 10: 결제 확인 CF.
 * ① orders 상태 pending 확인 (멱등성)
 * ② expiresAt > now 확인
 * ③ 토스 amount == orders.totalPrice + orders.shippingFee 일치 검증
 * ④ 토스 결제 승인 API → 성공: stock -= qty, reserved -= qty, status = 'paid', salesCount += qty
 * ⑤ 실패: reserved -= qty, status = 'failed'
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

interface ConfirmPayload {
  paymentKey: string;
  orderId: string;
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

async function callTossConfirm(paymentKey: string, orderId: string, amount: number): Promise<{ ok: true } | { ok: false }> {
  const secret = getSecretKey();
  const auth = Buffer.from(`${secret}:`, 'utf8').toString('base64');
  const res = await fetch(TOSS_CONFIRM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn('[confirmPayment] Toss confirm failed', res.status, err);
    return { ok: false };
  }
  const data = await res.json();
  if (Number(data.totalAmount) !== amount) {
    console.warn('[confirmPayment] amount mismatch', data.totalAmount, amount);
    return { ok: false };
  }
  return { ok: true };
}

export const confirmPayment = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'UNAUTHORIZED');

    const data = request.data as ConfirmPayload | undefined;
    const paymentKey = data?.paymentKey;
    const orderId = data?.orderId;
    if (!paymentKey || !orderId) {
      throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');
    }

    const db = getFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) throw new HttpsError('not-found', 'ORDER_NOT_FOUND');

    const orderData = orderSnap.data()!;
    if (orderData.userId !== auth.uid) throw new HttpsError('permission-denied', 'FORBIDDEN');
    if (orderData.status !== 'pending') {
      return { data: { alreadyProcessed: true, status: orderData.status } };
    }

    const expiresAt = orderData.expiresAt?.toDate?.() ?? orderData.expiresAt;
    const expiresTime = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
    if (expiresTime <= Date.now()) {
      throw new HttpsError('failed-precondition', 'ORDER_EXPIRED');
    }

    const totalPrice = Number(orderData.totalPrice ?? 0);
    const shippingFee = Number(orderData.shippingFee ?? 0);
    const expectedAmount = totalPrice + shippingFee;
    const items = (orderData.items ?? []) as OrderItem[];

    const tossResult = await callTossConfirm(paymentKey, orderId, expectedAmount);

    if (!tossResult.ok) {
      await db.runTransaction(async (tx) => {
        tx.update(orderRef, { status: 'failed' });
        for (const item of items) {
          const isbn = String(item.isbn);
          const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
          const invRef = db.collection('inventory').doc(isbn);
          const invSnap = await tx.get(invRef);
          const reserved = invSnap.exists ? Number(invSnap.data()?.reserved ?? 0) : 0;
          tx.set(invRef, { isbn, reserved: Math.max(0, reserved - qty), updatedAt: new Date() }, { merge: true });
        }
      });
      return { data: { success: false, reason: 'PAYMENT_FAILED' } };
    }

    const now = new Date();
    await db.runTransaction(async (tx) => {
      tx.update(orderRef, {
        status: 'paid',
        paymentKey,
        paidAt: now,
      });
      for (const item of items) {
        const isbn = String(item.isbn);
        const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
        const invRef = db.collection('inventory').doc(isbn);
        const bookRef = db.collection('books').doc(isbn);
        const invSnap = await tx.get(invRef);
        const bookSnap = await tx.get(bookRef);
        const stock = invSnap.exists ? Number(invSnap.data()?.stock ?? 0) : 0;
        const reserved = invSnap.exists ? Number(invSnap.data()?.reserved ?? 0) : 0;
        const salesCount = bookSnap.exists ? Number(bookSnap.data()?.salesCount ?? 0) : 0;
        tx.set(invRef, {
          isbn,
          stock: Math.max(0, stock - qty),
          reserved: Math.max(0, reserved - qty),
          updatedAt: now,
        }, { merge: true });
        if (bookSnap.exists) {
          tx.update(bookRef, { salesCount: salesCount + qty, updatedAt: now });
        }
      }
    });

    return { data: { success: true, orderId } };
  }
);
