"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestReturn = void 0;
/**
 * PRD Section 12: 반품 신청.
 * 조건: status=paid AND shippingStatus=delivered AND deliveredAt 7일 이내
 * → returnStatus=requested, status=return_requested
 */
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const RETURN_DEADLINE_DAYS = 7;
function isWithinReturnPeriod(deliveredAt) {
    if (!deliveredAt)
        return false;
    const d = deliveredAt instanceof Date
        ? deliveredAt
        : typeof deliveredAt.toDate === 'function'
            ? deliveredAt.toDate()
            : new Date(deliveredAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= RETURN_DEADLINE_DAYS;
}
exports.requestReturn = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
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
    if (orderData.status !== 'paid')
        throw new https_1.HttpsError('failed-precondition', 'ORDER_NOT_PAID');
    if (orderData.shippingStatus !== 'delivered')
        throw new https_1.HttpsError('failed-precondition', 'SHIPPING_NOT_DELIVERED');
    const returnStatus = orderData.returnStatus ?? 'none';
    if (returnStatus === 'requested')
        throw new https_1.HttpsError('failed-precondition', 'ALREADY_REQUESTED');
    if (returnStatus === 'completed')
        throw new https_1.HttpsError('failed-precondition', 'RETURN_ALREADY_COMPLETED');
    const deliveredAt = orderData.deliveredAt?.toDate?.() ?? orderData.deliveredAt;
    if (!deliveredAt)
        throw new https_1.HttpsError('failed-precondition', 'DELIVERED_AT_MISSING');
    if (!isWithinReturnPeriod(deliveredAt))
        throw new https_1.HttpsError('failed-precondition', 'RETURN_PERIOD_EXPIRED');
    const returnReason = typeof data?.returnReason === 'string' ? data.returnReason.slice(0, 500) : null;
    await orderRef.update({
        status: 'return_requested',
        returnStatus: 'requested',
        returnReason,
    });
    return { data: { ok: true, orderId } };
});
