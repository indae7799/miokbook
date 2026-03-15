import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function toIso(d: unknown): string | null {
  if (!d) return null;
  if (typeof (d as { toDate?: () => Date }).toDate === 'function') {
    return (d as { toDate: () => Date }).toDate().toISOString();
  }
  if (d instanceof Date) return d.toISOString();
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }
    const { id: eventId } = await params;
    const snap = await adminDb
      .collection('eventRegistrations')
      .where('eventId', '==', eventId)
      .orderBy('createdAt', 'desc')
      .get();
    const list = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        registrationId: doc.id,
        eventId: d.eventId,
        userId: d.userId,
        userName: d.userName ?? '',
        createdAt: toIso(d.createdAt),
      };
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error('[admin/events/[id]/registrations GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
