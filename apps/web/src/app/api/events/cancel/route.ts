import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { invalidate } from '@/lib/firestore-cache';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth || !adminDb) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const db = adminDb;

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = await request.json().catch(() => ({}));
    const registrationId = typeof body.registrationId === 'string' ? body.registrationId.trim() : '';
    const cancelReason = typeof body.cancelReason === 'string' ? body.cancelReason.trim() : '';
    if (!registrationId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }
    if (cancelReason.length > 300) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const regRef = db.collection('eventRegistrations').doc(registrationId);

    try {
      await db.runTransaction(async (tx) => {
        const regSnap = await tx.get(regRef);
        if (!regSnap.exists) {
          throw new Error('NOT_FOUND');
        }
        const d = regSnap.data()!;
        if (d.userId !== uid) {
          throw new Error('FORBIDDEN');
        }
        if (d.status !== 'registered') {
          throw new Error('INVALID_STATE');
        }

        tx.update(regRef, {
          status: 'cancelled',
          cancelReason,
          cancelledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        const eventId = typeof d.eventId === 'string' ? d.eventId : '';
        if (eventId) {
          const eventRef = db.collection('events').doc(eventId);
          const eventSnap = await tx.get(eventRef);
          if (eventSnap.exists) {
            tx.update(eventRef, {
              registeredCount: FieldValue.increment(-1),
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'NOT_FOUND') {
        return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
      }
      if (msg === 'FORBIDDEN') {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
      }
      if (msg === 'INVALID_STATE') {
        return NextResponse.json({ error: 'INVALID_STATE' }, { status: 400 });
      }
      throw e;
    }

    invalidate('events');
    invalidate('event');

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[events/cancel POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
