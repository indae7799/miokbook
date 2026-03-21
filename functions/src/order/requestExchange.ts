/**
 * PRD Section 12: 교환 신청.
 * 조건: status=paid AND shippingStatus=delivered AND deliveredAt 7일 이내
 * → status=exchange_requested
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const EXCHANGE_DEADLINE_DAYS = 7;

interface RequestExchangePayload {
  orderId: string;
  exchangeReason?: string;
}

function isWithinExchangePeriod(deliveredAt: Date | { toDate?: () => Date } | string | null): boolean {
  if (!deliveredAt) return false;
  const d = deliveredAt instanceof Date
    ? deliveredAt
    : typeof (deliveredAt as { toDate?: () => Date }).toDate === 'function'
      ? (deliveredAt as { toDate: () => Date }).toDate()
      : new Date(deliveredAt as string);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= EXCHANGE_DEADLINE_DAYS;
}

export const requestExchange = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'UNAUTHORIZED');

    const data = request.data as RequestExchangePayload | undefined;
    const orderId = data?.orderId;
    if (!orderId) throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');

    const db = getFirestore();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) throw new HttpsError('not-found', 'ORDER_NOT_FOUND');

    const orderData = orderSnap.data()!;
    if (orderData.userId !== auth.uid) throw new HttpsError('permission-denied', 'FORBIDDEN');
    if (orderData.status !== 'paid') throw new HttpsError('failed-precondition', 'ORDER_NOT_PAID');
    if (orderData.shippingStatus !== 'delivered') throw new HttpsError('failed-precondition', 'SHIPPING_NOT_DELIVERED');

    const status = orderData.status;
    if (status === 'exchange_requested') throw new HttpsError('failed-precondition', 'ALREADY_REQUESTED');
    if (status === 'exchange_completed') throw new HttpsError('failed-precondition', 'EXCHANGE_ALREADY_COMPLETED');
    if (status.startsWith('return_')) throw new HttpsError('failed-precondition', 'ALREADY_RETURN_PROCESS');

    const deliveredAt = orderData.deliveredAt?.toDate?.() ?? orderData.deliveredAt;
    if (!deliveredAt) throw new HttpsError('failed-precondition', 'DELIVERED_AT_MISSING');
    if (!isWithinExchangePeriod(deliveredAt)) throw new HttpsError('failed-precondition', 'EXCHANGE_PERIOD_EXPIRED');

    const exchangeReason = typeof data?.exchangeReason === 'string' ? data.exchangeReason.slice(0, 500) : null;

    await orderRef.update({
      status: 'exchange_requested',
      exchangeReason,
      updatedAt: new Date(),
    });

    return { data: { ok: true, orderId } };
  }
);
