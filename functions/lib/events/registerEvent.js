"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEvent = void 0;
/**
 * PRD Section 14: 이벤트 신청 (트랜잭션 내 원자성 보장).
 * ① 트랜잭션 내에서 event 읽기 → capacity 체크
 * ② 중복 확인 (userId + eventId)
 * ③ eventRegistrations 생성 + registeredCount increment
 */
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
exports.registerEvent = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    const auth = request.auth;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'UNAUTHORIZED');
    const data = request.data;
    const eventId = typeof data?.eventId === 'string' ? data.eventId.trim() : '';
    if (!eventId)
        throw new https_1.HttpsError('invalid-argument', 'VALIDATION_ERROR');
    const db = (0, firestore_1.getFirestore)();
    const uid = auth.uid;
    const userName = auth.token.name ?? auth.token.email ?? '회원';
    const existingSnap = await db
        .collection('eventRegistrations')
        .where('eventId', '==', eventId)
        .where('userId', '==', uid)
        .limit(1)
        .get();
    if (!existingSnap.empty) {
        throw new https_1.HttpsError('already-exists', 'ALREADY_REGISTERED');
    }
    const eventRef = db.collection('events').doc(eventId);
    const registrationRef = db.collection('eventRegistrations').doc();
    const now = new Date();
    await db.runTransaction(async (tx) => {
        const eventSnap = await tx.get(eventRef);
        if (!eventSnap.exists)
            throw new https_1.HttpsError('not-found', 'EVENT_NOT_FOUND');
        const eventData = eventSnap.data();
        if (eventData.isActive !== true)
            throw new https_1.HttpsError('failed-precondition', 'EVENT_NOT_ACTIVE');
        const capacity = Number(eventData.capacity ?? 0);
        const registeredCount = Number(eventData.registeredCount ?? 0);
        if (registeredCount >= capacity)
            throw new https_1.HttpsError('resource-exhausted', 'EVENT_FULL');
        tx.set(registrationRef, {
            registrationId: registrationRef.id,
            eventId,
            userId: uid,
            userName,
            userEmail: auth.token.email || '',
            phone: data?.phone || '',
            address: data?.address || '',
            status: 'registered',
            createdAt: now,
        });
        tx.update(eventRef, {
            registeredCount: firestore_1.FieldValue.increment(1),
            updatedAt: now,
        });
    });
    return { data: { success: true, registrationId: registrationRef.id } };
});
