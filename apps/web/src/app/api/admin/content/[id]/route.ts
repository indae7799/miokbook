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
    const { id } = await params;
    const doc = await adminDb.collection('articles').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    const d = doc.data()!;
    return NextResponse.json({
      articleId: doc.id,
      slug: d.slug ?? '',
      type: d.type ?? '',
      title: d.title ?? '',
      content: d.content ?? '',
      thumbnailUrl: d.thumbnailUrl ?? '',
      isPublished: Boolean(d.isPublished),
      createdAt: toIso(d.createdAt),
      updatedAt: toIso(d.updatedAt),
    });
  } catch (e) {
    console.error('[admin/content/[id] GET]', e);
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
    const ref = adminDb.collection('articles').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim();
    if (typeof body.slug === 'string' && body.slug.trim()) {
      const slug = body.slug.trim().replace(/\s+/g, '-');
      const existing = await adminDb.collection('articles').where('slug', '==', slug).get();
      const sameDoc = existing.docs.find((x) => x.id === id);
      if (!existing.empty && !sameDoc) {
        return NextResponse.json({ error: 'SLUG_EXISTS' }, { status: 409 });
      }
      updates.slug = slug;
    }
    if (['author_interview', 'bookstore_story', 'publisher_story'].includes(body.type)) updates.type = body.type;
    if (typeof body.content === 'string') updates.content = body.content;
    if (typeof body.thumbnailUrl === 'string' && body.thumbnailUrl.trim()) updates.thumbnailUrl = body.thumbnailUrl.trim();
    if (typeof body.isPublished === 'boolean') updates.isPublished = body.isPublished;

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }
    await ref.update(updates);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/content/[id] PATCH]', e);
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
    const ref = adminDb.collection('articles').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/content/[id] DELETE]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
