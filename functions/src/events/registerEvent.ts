/**
 * PRD Section 14: 이벤트 신청 (트랜잭션 내 원자성 보장).
 * ① 트랜잭션 내에서 event 읽기 → capacity 체크
 * ② 중복 확인 (userId + eventId)
 * ③ eventRegistrations 생성 + registeredCount increment
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

    const existingSnap = await db
      .collection('eventRegistrations')
      .where('eventId', '==', eventId)
      .where('userId', '==', uid)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      throw new HttpsError('already-exists', 'ALREADY_REGISTERED');
    }

    const eventRef = db.collection('events').doc(eventId);
    const registrationRef = db.collection('eventRegistrations').doc();
    const now = new Date();

    await db.runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) throw new HttpsError('not-found', 'EVENT_NOT_FOUND');

      const eventData = eventSnap.data()!;
      if (eventData.isActive !== true) throw new HttpsError('failed-precondition', 'EVENT_NOT_ACTIVE');

      const capacity = Number(eventData.capacity ?? 0);
      const registeredCount = Number(eventData.registeredCount ?? 0);
      if (registeredCount >= capacity) throw new HttpsError('resource-exhausted', 'EVENT_FULL');

      tx.set(registrationRef, {
        registrationId: registrationRef.id,
        eventId,
        userId: uid,
        userName,
        userEmail: auth.token.email || '',
        phone: (data as any)?.phone || '',
        address: (data as any)?.address || '',
        status: 'registered',
        createdAt: now,
      });
      tx.update(eventRef, {
        registeredCount: FieldValue.increment(1),
        updatedAt: now,
      });
    });

    return { data: { success: true, registrationId: registrationRef.id } };
  }
);
