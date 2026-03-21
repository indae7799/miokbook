/**
 * PRD Section 14: 이벤트 신청 취소.
 * 트랜잭션 내에서 registration 삭제 + registeredCount decrement.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface CancelPayload {
  registrationId: string;
  cancelReason?: string;
}

export const cancelRegistration = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'UNAUTHORIZED');

    const data = request.data as CancelPayload | undefined;
    const registrationId = typeof data?.registrationId === 'string' ? data.registrationId.trim() : '';
    const cancelReason = typeof data?.cancelReason === 'string' ? data.cancelReason.trim() : '';
    if (!registrationId) throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');
    if (cancelReason.length > 300) throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');

    const db = getFirestore();
    const uid = auth.uid;

    const regRef = db.collection('eventRegistrations').doc(registrationId);

    await db.runTransaction(async (tx) => {
      const regSnap = await tx.get(regRef);
      if (!regSnap.exists) throw new HttpsError('not-found', 'REGISTRATION_NOT_FOUND');

      const regData = regSnap.data()!;
      if (regData.userId !== uid) throw new HttpsError('permission-denied', 'NOT_YOUR_REGISTRATION');
      if (regData.status === 'cancelled') throw new HttpsError('failed-precondition', 'ALREADY_CANCELLED');

      const eventRef = db.collection('events').doc(regData.eventId);

      tx.update(regRef, {
        status: 'cancelled',
        cancelReason: cancelReason || null,
        cancelledAt: new Date(),
      });
      tx.update(eventRef, {
        registeredCount: FieldValue.increment(-1),
        updatedAt: new Date(),
      });
    });

    return { data: { success: true } };
  }
);
