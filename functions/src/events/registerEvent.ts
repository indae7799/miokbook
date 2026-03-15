/**
 * PRD Section 14: 이벤트 신청.
 * ① eventRegistrations 중복 확인 (userId + eventId)
 * ② registeredCount >= capacity → throw EVENT_FULL
 * ③ eventRegistrations 생성
 * ④ events/{eventId}.registeredCount += 1
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

interface RegisterEventPayload {
  eventId: string;
}

export const registerEvent = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'UNAUTHORIZED');

    const data = request.data as RegisterEventPayload | undefined;
    const eventId = typeof data?.eventId === 'string' ? data.eventId.trim() : '';
    if (!eventId) throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');

    const db = getFirestore();
    const uid = auth.uid;
    const userName = auth.token.name ?? auth.token.email ?? '회원';

    const eventRef = db.collection('events').doc(eventId);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) throw new HttpsError('not-found', 'EVENT_NOT_FOUND');

    const eventData = eventSnap.data()!;
    if (eventData.isActive !== true) throw new HttpsError('failed-precondition', 'EVENT_NOT_ACTIVE');

    const capacity = Number(eventData.capacity ?? 0);
    const registeredCount = Number(eventData.registeredCount ?? 0);
    if (registeredCount >= capacity) throw new HttpsError('resource-exhausted', 'EVENT_FULL');

    const existingSnap = await db
      .collection('eventRegistrations')
      .where('eventId', '==', eventId)
      .where('userId', '==', uid)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      throw new HttpsError('already-exists', 'ALREADY_REGISTERED');
    }

    const registrationRef = db.collection('eventRegistrations').doc();
    const now = new Date();

    await db.runTransaction(async (tx) => {
      tx.set(registrationRef, {
        registrationId: registrationRef.id,
        eventId,
        userId: uid,
        userName,
        createdAt: now,
      });
      tx.update(eventRef, {
        registeredCount: registeredCount + 1,
        updatedAt: now,
      });
    });

    return { data: { success: true, registrationId: registrationRef.id } };
  }
);
