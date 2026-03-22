"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reserveStock = void 0;
/**
 * PRD Section 8: 재고 예약.
 * runTransaction: for each item (stock - reserved) >= quantity else throw STOCK_SHORTAGE; reserved += quantity.
 */
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.reserveStock = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    const auth = request.auth;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'UNAUTHORIZED');
    const data = request.data;
    const orderId = data?.orderId;
    if (!orderId)
        throw new https_1.HttpsError('invalid-argument', 'VALIDATION_ERROR');
    const db = (0, firestore_1.getFirestore)();
    const orderSnap = await db.collection('orders').doc(orderId).get();
    if (!orderSnap.exists)
        throw new https_1.HttpsError('not-found', 'ORDER_NOT_FOUND');
    const orderData = orderSnap.data();
    if (orderData.userId !== auth.uid)
        throw new https_1.HttpsError('permission-denied', 'FORBIDDEN');
    if (orderData.status !== 'pending')
        throw new https_1.HttpsError('failed-precondition', 'ORDER_NOT_PENDING');
    const items = orderData.items;
    if (!Array.isArray(items) || items.length === 0)
        throw new https_1.HttpsError('invalid-argument', 'VALIDATION_ERROR');
    await db.runTransaction(async (tx) => {
        for (const item of items) {
            const invRef = db.collection('inventory').doc(item.isbn);
            const invSnap = await tx.get(invRef);
            const stock = invSnap.exists ? Number(invSnap.data()?.stock ?? 0) : 0;
            const reserved = invSnap.exists ? Number(invSnap.data()?.reserved ?? 0) : 0;
            const available = stock - reserved;
            const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
            if (available < qty) {
                throw new https_1.HttpsError('failed-precondition', 'STOCK_SHORTAGE');
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
});
