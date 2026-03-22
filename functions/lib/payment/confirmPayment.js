"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmPayment = void 0;
/**
 * PRD Section 10: 결제 확인 CF (멱등성 보장).
 * ① orders 상태 pending 확인 (트랜잭션 내)
 * ② expiresAt > now 확인
 * ③ 토스 amount == orders.totalPrice + shippingFee 일치 검증
 * ④ 토스 결제 승인 API → 성공: stock -= qty, reserved -= qty, status='paid', salesCount += qty
 * ⑤ 실패: reserved -= qty, status='failed'
 */
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const triggerStoreRevalidate_1 = require("../lib/triggerStoreRevalidate");
const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';
function getSecretKey() {
    const key = process.env.TOSS_SECRET_KEY;
    if (!key)
        throw new https_1.HttpsError('failed-precondition', 'TOSS_NOT_CONFIGURED');
    return key;
}
async function callTossConfirm(paymentKey, orderId, amount) {
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
exports.confirmPayment = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    const auth = request.auth;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'UNAUTHORIZED');
    const data = request.data;
    const paymentKey = data?.paymentKey;
    const orderId = data?.orderId;
    if (!paymentKey || !orderId) {
        throw new https_1.HttpsError('invalid-argument', 'VALIDATION_ERROR');
    }
    const db = (0, firestore_1.getFirestore)();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists)
        throw new https_1.HttpsError('not-found', 'ORDER_NOT_FOUND');
    const orderData = orderSnap.data();
    if (orderData.userId !== auth.uid)
        throw new https_1.HttpsError('permission-denied', 'FORBIDDEN');
    if (orderData.status === 'paid') {
        return { data: { alreadyProcessed: true, status: 'paid' } };
    }
    if (orderData.status !== 'pending') {
        return { data: { alreadyProcessed: true, status: orderData.status } };
    }
    const expiresAt = orderData.expiresAt?.toDate?.() ?? orderData.expiresAt;
    const expiresTime = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
    if (expiresTime <= Date.now()) {
        throw new https_1.HttpsError('failed-precondition', 'ORDER_EXPIRED');
    }
    const totalPrice = Number(orderData.totalPrice ?? 0);
    const shippingFee = Number(orderData.shippingFee ?? 0);
    const expectedAmount = totalPrice + shippingFee;
    const items = (orderData.items ?? []);
    const tossResult = await callTossConfirm(paymentKey, orderId, expectedAmount);
    if (!tossResult.ok) {
        await db.runTransaction(async (tx) => {
            const freshSnap = await tx.get(orderRef);
            if (freshSnap.data()?.status !== 'pending')
                return;
            tx.update(orderRef, { status: 'failed' });
            for (const item of items) {
                const isbn = String(item.isbn);
                const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
                const invRef = db.collection('inventory').doc(isbn);
                tx.set(invRef, { reserved: firestore_1.FieldValue.increment(-qty), updatedAt: new Date() }, { merge: true });
            }
        });
        return { data: { success: false, reason: 'PAYMENT_FAILED' } };
    }
    const now = new Date();
    await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(orderRef);
        const freshStatus = freshSnap.data()?.status;
        if (freshStatus === 'paid')
            return;
        if (freshStatus !== 'pending')
            return;
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
            tx.set(invRef, {
                stock: firestore_1.FieldValue.increment(-qty),
                reserved: firestore_1.FieldValue.increment(-qty),
                updatedAt: now,
            }, { merge: true });
            tx.update(bookRef, { salesCount: firestore_1.FieldValue.increment(qty), updatedAt: now });
        }
    });
    void (0, triggerStoreRevalidate_1.triggerStoreRevalidate)().catch((e) => console.warn('[confirmPayment] revalidate', e));
    return { data: { success: true, orderId } };
});
