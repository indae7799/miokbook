"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrder = void 0;
/**
 * PRD Section 8, 12: 주문 취소 (멱등성 보장).
 * 조건: status=paid AND shippingStatus=ready
 * ① 토스 환불 API ② 성공: stock += qty, status=cancelled_by_customer ③ 실패: throw PAYMENT_FAILED
 */
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const triggerStoreRevalidate_1 = require("../lib/triggerStoreRevalidate");
const TOSS_CANCEL_BASE = 'https://api.tosspayments.com/v1/payments';
function getSecretKey() {
    const key = process.env.TOSS_SECRET_KEY;
    if (!key)
        throw new https_1.HttpsError('failed-precondition', 'TOSS_NOT_CONFIGURED');
    return key;
}
async function callTossCancel(paymentKey, cancelReason) {
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
exports.cancelOrder = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    const auth = request.auth;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'UNAUTHORIZED');
    const data = request.data;
    const orderId = data?.orderId;
    if (!orderId)
        throw new https_1.HttpsError('invalid-argument', 'VALIDATION_ERROR');
    const db = (0, firestore_1.getFirestore)();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists)
        throw new https_1.HttpsError('not-found', 'ORDER_NOT_FOUND');
    const orderData = orderSnap.data();
    if (orderData.userId !== auth.uid)
        throw new https_1.HttpsError('permission-denied', 'FORBIDDEN');
    if (orderData.status === 'cancelled_by_customer') {
        return { data: { ok: true, orderId, alreadyProcessed: true } };
    }
    if (orderData.status !== 'paid')
        throw new https_1.HttpsError('failed-precondition', 'ORDER_NOT_PAID');
    if (orderData.shippingStatus !== 'ready')
        throw new https_1.HttpsError('failed-precondition', 'SHIPPING_ALREADY_SENT');
    const paymentKey = orderData.paymentKey;
    if (!paymentKey)
        throw new https_1.HttpsError('failed-precondition', 'PAYMENT_KEY_MISSING');
    const cancelReason = String(data?.cancelReason ?? '고객 요청 취소').slice(0, 200);
    const cancelled = await callTossCancel(paymentKey, cancelReason);
    if (!cancelled) {
        throw new https_1.HttpsError('internal', 'PAYMENT_FAILED');
    }
    const items = (orderData.items ?? []);
    const now = new Date();
    await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(orderRef);
        if (freshSnap.data()?.status === 'cancelled_by_customer')
            return;
        tx.update(orderRef, { status: 'cancelled_by_customer', cancelledAt: now });
        for (const item of items) {
            const isbn = String(item.isbn);
            const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
            const invRef = db.collection('inventory').doc(isbn);
            const bookRef = db.collection('books').doc(isbn);
            tx.set(invRef, { stock: firestore_1.FieldValue.increment(qty), updatedAt: now }, { merge: true });
            tx.update(bookRef, { salesCount: firestore_1.FieldValue.increment(-qty), updatedAt: now });
        }
    });
    void (0, triggerStoreRevalidate_1.triggerStoreRevalidate)().catch((e) => console.warn('[cancelOrder] revalidate', e));
    return { data: { ok: true, orderId } };
});
