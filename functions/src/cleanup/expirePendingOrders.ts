/**
 * PRD Section 10 Step 5: Pending 주문 자동 만료.
 * 매 30분: status=pending AND expiresAt < now → reserved 해제, status=cancelled
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

interface OrderItem {
  isbn: string;
  quantity: number;
}

export const expirePendingOrders = onSchedule(
  { schedule: 'every 30 minutes', timeZone: 'Asia/Seoul' },
  async () => {
    const db = getFirestore();
    const now = new Date();

    const snapshot = await db
      .collection('orders')
      .where('status', '==', 'pending')
      .where('expiresAt', '<', now)
      .get();

    let count = 0;
    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        const items = (data.items ?? []) as OrderItem[];
        await db.runTransaction(async (tx) => {
          const orderRef = doc.ref;
          tx.update(orderRef, { status: 'cancelled', cancelledAt: now });
          for (const item of items) {
            const isbn = String(item.isbn);
            const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
            const invRef = db.collection('inventory').doc(isbn);
            const invSnap = await tx.get(invRef);
            const reserved = invSnap.exists ? Number(invSnap.data()?.reserved ?? 0) : 0;
            tx.set(invRef, { isbn, reserved: Math.max(0, reserved - qty), updatedAt: now }, { merge: true });
          }
        });
        count++;
      } catch (e) {
        console.error('[expirePendingOrders] doc', doc.id, e);
      }
    }
    if (count > 0) {
      console.log('[expirePendingOrders] expired', count, 'orders');
    }
  }
);
