/**
 * PRD Section 12: 반품 신청.
 * 조건: status=paid AND shippingStatus=delivered AND deliveredAt 7일 이내
 * → returnStatus=requested, status=return_requested
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const RETURN_DEADLINE_DAYS = 7;

interface RequestReturnPayload {
  orderId: string;
  returnReason?: string;
}

function isWithinReturnPeriod(deliveredAt: Date | { toDate?: () => Date } | string | null): boolean {
  if (!deliveredAt) return false;
  const d = deliveredAt instanceof Date
    ? deliveredAt
    : typeof (deliveredAt as { toDate?: () => Date }).toDate === 'function'
      ? (deliveredAt as { toDate: () => Date }).toDate()
      : new Date(deliveredAt as string);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= RETURN_DEADLINE_DAYS;
}

export const requestReturn = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'UNAUTHORIZED');

    const data = request.data as RequestReturnPayload | undefined;
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

    const returnStatus = orderData.returnStatus ?? 'none';
    if (returnStatus === 'requested') throw new HttpsError('failed-precondition', 'ALREADY_REQUESTED');
    if (returnStatus === 'completed') throw new HttpsError('failed-precondition', 'RETURN_ALREADY_COMPLETED');

    const deliveredAt = orderData.deliveredAt?.toDate?.() ?? orderData.deliveredAt;
    if (!deliveredAt) throw new HttpsError('failed-precondition', 'DELIVERED_AT_MISSING');
    if (!isWithinReturnPeriod(deliveredAt)) throw new HttpsError('failed-precondition', 'RETURN_PERIOD_EXPIRED');

    const returnReason = typeof data?.returnReason === 'string' ? data.returnReason.slice(0, 500) : null;

    await orderRef.update({
      status: 'return_requested',
      returnStatus: 'requested',
      returnReason,
    });

    return { data: { ok: true, orderId } };
  }
);
