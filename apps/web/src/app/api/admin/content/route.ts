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

    const snap = await adminDb
      .collection('articles')
      .orderBy('createdAt', 'desc')
      .get();
    const list = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        articleId: doc.id,
        slug: d.slug ?? '',
        type: d.type ?? '',
        title: d.title ?? '',
        thumbnailUrl: d.thumbnailUrl ?? '',
        isPublished: Boolean(d.isPublished),
        createdAt: toIso(d.createdAt),
        updatedAt: toIso(d.updatedAt),
      };
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error('[admin/content GET]', e);
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
    const slug = typeof body.slug === 'string' ? body.slug.trim().replace(/\s+/g, '-') : '';
    const type = ['author_interview', 'bookstore_story', 'publisher_story'].includes(body.type) ? body.type : 'bookstore_story';
    const content = typeof body.content === 'string' ? body.content : '';
    const thumbnailUrl = typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl.trim() : '';
    const isPublished = body.isPublished === true;
    if (!title || !slug || !thumbnailUrl) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const existingSlug = await adminDb.collection('articles').where('slug', '==', slug).limit(1).get();
    if (!existingSlug.empty) {
      return NextResponse.json({ error: 'SLUG_EXISTS' }, { status: 409 });
    }

    const ref = adminDb.collection('articles').doc();
    const now = new Date();
    await ref.set({
      articleId: ref.id,
      slug,
      type,
      title,
      content,
      thumbnailUrl,
      isPublished,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ articleId: ref.id, ok: true });
  } catch (e) {
    console.error('[admin/content POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
