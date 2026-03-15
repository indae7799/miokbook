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

    const doc = await adminDb.collection('cms').doc('home').get();
    if (!doc.exists) {
      return NextResponse.json({
        heroBanners: [],
        featuredBooks: [],
        monthlyPick: null,
        themeCurations: [],
        popup: null,
        updatedAt: null,
      });
    }

    const d = doc.data()!;
    const featuredBooks = (d.featuredBooks ?? []).map((b: { isbn: string; title: string; coverImage: string; priority: number; recommendationText: string }) => ({
      isbn: b.isbn,
      title: b.title,
      coverImage: b.coverImage,
      priority: b.priority,
      recommendationText: b.recommendationText ?? '',
    }));
    const monthlyPick = d.monthlyPick
      ? {
          isbn: d.monthlyPick.isbn,
          title: d.monthlyPick.title,
          coverImage: d.monthlyPick.coverImage,
          description: d.monthlyPick.description ?? '',
        }
      : null;
    const heroBanners = (d.heroBanners ?? []).map((b: Record<string, unknown>) => ({
      ...b,
      startDate: toIso(b.startDate),
      endDate: toIso(b.endDate),
    }));
    const themeCurations = d.themeCurations ?? [];
    const popup = d.popup ? { ...d.popup, endDate: toIso((d.popup as { endDate?: unknown }).endDate) } : null;

    return NextResponse.json({
      heroBanners,
      featuredBooks,
      monthlyPick,
      themeCurations,
      popup,
      updatedAt: toIso(d.updatedAt),
    });
  } catch (e) {
    console.error('[admin/cms GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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
    const ref = adminDb.collection('cms').doc('home');
    const now = new Date();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (Array.isArray(body.featuredBooks)) updates.featuredBooks = body.featuredBooks;
    if (Array.isArray(body.heroBanners)) {
      updates.heroBanners = body.heroBanners.map((b: Record<string, unknown>) => ({
        ...b,
        startDate: b.startDate && typeof b.startDate === 'string' ? new Date(b.startDate) : b.startDate,
        endDate: b.endDate && typeof b.endDate === 'string' ? new Date(b.endDate) : b.endDate,
      }));
    }
    if (body.popup !== undefined && typeof body.popup === 'object') updates.popup = body.popup;

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }
    await ref.set(updates, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/cms PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
