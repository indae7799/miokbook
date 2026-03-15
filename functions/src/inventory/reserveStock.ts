/**
 * PRD Section 8: 재고 예약.
 * runTransaction: for each item (stock - reserved) >= quantity else throw STOCK_SHORTAGE; reserved += quantity.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

interface ReserveStockPayload {
  orderId: string;
}

export const reserveStock = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'UNAUTHORIZED');

    const data = request.data as ReserveStockPayload | undefined;
    const orderId = data?.orderId;
    if (!orderId) throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');

    const db = getFirestore();
    const orderSnap = await db.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) throw new HttpsError('not-found', 'ORDER_NOT_FOUND');

    const orderData = orderSnap.data()!;
    if (orderData.userId !== auth.uid) throw new HttpsError('permission-denied', 'FORBIDDEN');
    if (orderData.status !== 'pending') throw new HttpsError('failed-precondition', 'ORDER_NOT_PENDING');

    const items = orderData.items as Array<{ isbn: string; quantity: number }>;
    if (!Array.isArray(items) || items.length === 0) throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');

    await db.runTransaction(async (tx) => {
      for (const item of items) {
        const invRef = db.collection('inventory').doc(item.isbn);
        const invSnap = await tx.get(invRef);
        const stock = invSnap.exists ? Number(invSnap.data()?.stock ?? 0) : 0;
        const reserved = invSnap.exists ? Number(invSnap.data()?.reserved ?? 0) : 0;
        const available = stock - reserved;
        const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
        if (available < qty) {
          throw new HttpsError('failed-precondition', 'STOCK_SHORTAGE');
        }
        tx.set(invRef, {
          isbn: item.isbn,
          stock,
          reserved: reserved + qty,
          updatedAt: new Date(),
        }, { merge: true });
      }
    });

    return { data: { ok: true } };
  }
);
