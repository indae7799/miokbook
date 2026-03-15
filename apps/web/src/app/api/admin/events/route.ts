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

export async function GET(request: Request) {
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

    const snap = await adminDb.collection('events').orderBy('date', 'desc').get();
    const list = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        eventId: doc.id,
        title: d.title ?? '',
        type: d.type ?? '',
        description: d.description ?? '',
        imageUrl: d.imageUrl ?? '',
        date: toIso(d.date),
        location: d.location ?? '',
        capacity: Number(d.capacity ?? 0),
        registeredCount: Number(d.registeredCount ?? 0),
        isActive: Boolean(d.isActive),
        createdAt: toIso(d.createdAt),
        updatedAt: toIso(d.updatedAt),
      };
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error('[admin/events GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const type = ['book_concert', 'author_talk', 'book_club'].includes(body.type) ? body.type : 'book_concert';
    const description = typeof body.description === 'string' ? body.description : '';
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
    const location = typeof body.location === 'string' ? body.location.trim() : '';
    const capacity = Math.max(1, parseInt(String(body.capacity), 10) || 1);
    const isActive = body.isActive !== false;
    const dateStr = typeof body.date === 'string' ? body.date : '';
    const date = dateStr ? new Date(dateStr) : new Date();
    if (!title || !imageUrl) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const ref = adminDb.collection('events').doc();
    const now = new Date();
    await ref.set({
      eventId: ref.id,
      title,
      type,
      description,
      imageUrl,
      date,
      location,
      capacity,
      registeredCount: 0,
      isActive,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ eventId: ref.id, ok: true });
  } catch (e) {
    console.error('[admin/events POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
