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
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = _request.headers.get('authorization');
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
    const { id } = await params;
    const doc = await adminDb.collection('events').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    const d = doc.data()!;
    return NextResponse.json({
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
    });
  } catch (e) {
    console.error('[admin/events/[id] GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(
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
    const { id } = await params;
    const ref = adminDb.collection('events').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim();
    if (['book_concert', 'author_talk', 'book_club'].includes(body.type)) updates.type = body.type;
    if (typeof body.description === 'string') updates.description = body.description;
    if (typeof body.imageUrl === 'string' && body.imageUrl.trim()) updates.imageUrl = body.imageUrl.trim();
    if (typeof body.location === 'string') updates.location = body.location.trim();
    if (typeof body.capacity === 'number' && body.capacity >= 1) updates.capacity = body.capacity;
    if (typeof body.isActive === 'boolean') updates.isActive = body.isActive;
    if (typeof body.date === 'string' && body.date) {
      const d = new Date(body.date);
      if (!Number.isNaN(d.getTime())) updates.date = d;
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }
    await ref.update(updates);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/events/[id] PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
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
    const { id } = await params;
    const ref = adminDb.collection('events').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/events/[id] DELETE]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
