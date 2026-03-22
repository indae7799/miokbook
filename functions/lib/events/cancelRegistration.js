"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelRegistration = void 0;
/**
 * PRD Section 14: 이벤트 신청 취소.
 * 트랜잭션 내에서 registration 삭제 + registeredCount decrement.
 */
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.cancelRegistration = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    const auth = request.auth;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'UNAUTHORIZED');
    const data = request.data;
    const registrationId = typeof data?.registrationId === 'string' ? data.registrationId.trim() : '';
    const cancelReason = typeof data?.cancelReason === 'string' ? data.cancelReason.trim() : '';
    if (!registrationId)
        throw new https_1.HttpsError('invalid-argument', 'VALIDATION_ERROR');
    if (cancelReason.length > 300)
        throw new https_1.HttpsError('invalid-argument', 'VALIDATION_ERROR');
    const db = (0, firestore_1.getFirestore)();
    const uid = auth.uid;
    const regRef = db.collection('eventRegistrations').doc(registrationId);
    await db.runTransaction(async (tx) => {
        const regSnap = await tx.get(regRef);
        if (!regSnap.exists)
            throw new https_1.HttpsError('not-found', 'REGISTRATION_NOT_FOUND');
        const regData = regSnap.data();
        if (regData.userId !== uid)
            throw new https_1.HttpsError('permission-denied', 'NOT_YOUR_REGISTRATION');
        if (regData.status === 'cancelled')
            throw new https_1.HttpsError('failed-precondition', 'ALREADY_CANCELLED');
        const eventRef = db.collection('events').doc(regData.eventId);
        tx.update(regRef, {
            status: 'cancelled',
            cancelReason: cancelReason || null,
            cancelledAt: new Date(),
        });
        tx.update(eventRef, {
            registeredCount: firestore_1.FieldValue.increment(-1),
            updatedAt: new Date(),
        });
    });
    return { data: { success: true } };
});
