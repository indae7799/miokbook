import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { invalidate } from '@/lib/firestore-cache';
import { CMS_HOME_CACHE_TAG } from '@/lib/cache-tags';
import { clampStoredPopupDimensions } from '@/lib/popup-dimensions';
import { invalidateCmsHomeMemCache } from '@/lib/store/home';

export const dynamic = 'force-dynamic';

function toIso(d: unknown): string | null {
  if (!d) return null;
  if (typeof (d as { toDate?: () => Date }).toDate === 'function') {
    return (d as { toDate: () => Date }).toDate().toISOString();
  }
  if (d instanceof Date) return d.toISOString();
  return null;
}

function normalizePopupForResponse(popup: Record<string, unknown>) {
  const { widthPx, heightPx } = clampStoredPopupDimensions(popup.widthPx, popup.heightPx);
  return {
    ...popup,
    id: popup.id ?? null,
    priority: Number(popup.priority ?? 0),
    endDate: toIso(popup.endDate),
    slotIndex: Number(popup.slotIndex ?? 0),
    widthPx,
    heightPx,
  };
}

function normalizePopupForWrite(popup: Record<string, unknown>) {
  const { widthPx, heightPx } = clampStoredPopupDimensions(popup.widthPx, popup.heightPx);
  return {
    ...popup,
    priority: Number(popup.priority ?? 0),
    endDate: popup.endDate && typeof popup.endDate === 'string' ? new Date(popup.endDate) : popup.endDate,
    slotIndex: Number(popup.slotIndex ?? 0),
    widthPx,
    heightPx,
  };
}

const emptyCmsResponse = (degraded?: boolean) => ({
  heroBanners: [],
  featuredBooks: [],
  monthlyPick: null,
  themeCurations: [],
  selectedBooks: {},
  selectedBooksBanner: null,
  storeHeroImage: null,
  mainBottomLeft: null,
  mainBottomRight: null,
  popup: null,
  popups: [],
  updatedAt: null,
  ...(degraded ? { firestoreDegraded: true } : {}),
});

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    let decoded: { role?: string };
    try {
      decoded = (await adminAuth.verifyIdToken(idToken)) as { role?: string };
    } catch {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    let doc;
    try {
      doc = await adminDb.collection('cms').doc('home').get();
    } catch (readErr) {
      console.error('[admin/cms GET] Firestore read failed', readErr);
      return NextResponse.json(emptyCmsResponse(true));
    }
    if (!doc.exists) {
      return NextResponse.json(emptyCmsResponse());
    }

    const d = doc.data()!;
    const storeHeroImage = d.storeHeroImage
      ? { imageUrl: d.storeHeroImage.imageUrl ?? '', linkUrl: d.storeHeroImage.linkUrl ?? '/' }
      : null;
    const mainBottomLeft = d.mainBottomLeft?.imageUrl?.trim()
      ? { imageUrl: d.mainBottomLeft.imageUrl, linkUrl: d.mainBottomLeft.linkUrl ?? '/' }
      : null;
    const mainBottomRight = d.mainBottomRight?.imageUrl?.trim()
      ? { imageUrl: d.mainBottomRight.imageUrl, linkUrl: d.mainBottomRight.linkUrl ?? '/' }
      : null;
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
    const selectedBooks = d.selectedBooks ?? {};
    const selectedBooksBannerRaw = d.selectedBooksBanner;
    const selectedBooksBanner = selectedBooksBannerRaw?.imageUrl?.trim()
      ? { imageUrl: selectedBooksBannerRaw.imageUrl, linkUrl: selectedBooksBannerRaw.linkUrl ?? '/' }
      : null;
    const popups = (
      Array.isArray(d.popups)
        ? d.popups
        : (d.popup ? [d.popup] : [])
    )
      .map((popup: Record<string, unknown>) => normalizePopupForResponse(popup))
      .sort((a, b) => Number(a.slotIndex ?? 0) - Number(b.slotIndex ?? 0));
    const popup = popups[0] ?? null;

    return NextResponse.json({
      heroBanners,
      featuredBooks,
      monthlyPick,
      themeCurations,
      selectedBooks,
      selectedBooksBanner,
      storeHeroImage,
      mainBottomLeft,
      mainBottomRight,
      popup,
      popups,
      updatedAt: toIso(d.updatedAt),
    });
  } catch (e) {
    console.error('[admin/cms GET]', e);
    return NextResponse.json(emptyCmsResponse(true));
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: '요청 본문이 객체여야 합니다.' }, { status: 400 });
    }
    const ref = adminDb.collection('cms').doc('home');
    const now = new Date();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (Array.isArray(body.featuredBooks)) updates.featuredBooks = body.featuredBooks;
    if (Array.isArray(body.heroBanners)) {
      updates.heroBanners = body.heroBanners.map((b: Record<string, unknown>) => {
        const startDate = b.startDate && typeof b.startDate === 'string' ? new Date(b.startDate) : b.startDate;
        const endDate = b.endDate && typeof b.endDate === 'string' ? new Date(b.endDate) : b.endDate;
        return {
          id: b.id ?? '',
          imageUrl: typeof b.imageUrl === 'string' ? b.imageUrl : String(b.imageUrl ?? ''),
          linkUrl: typeof b.linkUrl === 'string' ? b.linkUrl : String(b.linkUrl ?? '/'),
          position: b.position ?? 'main_hero',
          isActive: b.isActive !== false,
          order: Number(b.order ?? 0),
          startDate,
          endDate,
        };
      });
    }
    if (Array.isArray(body.popups)) {
      const popups = body.popups
        .filter((popup: unknown) => popup && typeof popup === 'object')
        .map((popup: Record<string, unknown>) => normalizePopupForWrite(popup))
        .sort((a: ReturnType<typeof normalizePopupForWrite>, b: ReturnType<typeof normalizePopupForWrite>) => Number(a.slotIndex ?? 0) - Number(b.slotIndex ?? 0));
      updates.popups = popups;
      updates.popup = popups[0] ?? null;
    } else if (body.popup !== undefined && typeof body.popup === 'object') {
      const popup = normalizePopupForWrite(body.popup as Record<string, unknown>);
      updates.popup = popup;
      updates.popups = popup ? [popup] : [];
    }
    if (body.monthlyPick !== undefined) updates.monthlyPick = body.monthlyPick;
    if (body.storeHeroImage !== undefined) {
      const sh = body.storeHeroImage as { imageUrl?: unknown; linkUrl?: unknown } | undefined;
      const url = sh && typeof sh === 'object' ? String(sh.imageUrl ?? '').trim() : '';
      updates.storeHeroImage =
        url ? { imageUrl: url, linkUrl: (sh && String(sh.linkUrl ?? '/').trim()) || '/' } : null;
    }
    if (body.mainBottomLeft !== undefined) {
      const m = body.mainBottomLeft as { imageUrl?: unknown; linkUrl?: unknown } | undefined;
      const url = m && typeof m === 'object' ? String(m.imageUrl ?? '').trim() : '';
      updates.mainBottomLeft =
        url ? { imageUrl: url, linkUrl: (m && String(m.linkUrl ?? '/').trim()) || '/' } : null;
    }
    if (body.mainBottomRight !== undefined) {
      const m = body.mainBottomRight as { imageUrl?: unknown; linkUrl?: unknown } | undefined;
      const url = m && typeof m === 'object' ? String(m.imageUrl ?? '').trim() : '';
      updates.mainBottomRight =
        url ? { imageUrl: url, linkUrl: (m && String(m.linkUrl ?? '/').trim()) || '/' } : null;
    }
    if (body.selectedBooks !== undefined && typeof body.selectedBooks === 'object' && !Array.isArray(body.selectedBooks)) {
      updates.selectedBooks = body.selectedBooks;
    }
    if (body.selectedBooksBanner !== undefined) {
      const sb = body.selectedBooksBanner as { imageUrl?: unknown; linkUrl?: unknown } | null | undefined;
      const url = sb && typeof sb === 'object' ? String(sb.imageUrl ?? '').trim() : '';
      updates.selectedBooksBanner = url
        ? { imageUrl: url, linkUrl: (sb && String(sb.linkUrl ?? '/').trim()) || '/' }
        : null;
    }
    if (Array.isArray(body.themeCurations)) {
      updates.themeCurations = body.themeCurations.map((t: Record<string, unknown>) => {
        const books = Array.isArray(t.books) ? t.books as { isbn: string }[] : [];
        const isbns = books.length > 0 ? books.map((b) => b.isbn) : (Array.isArray(t.isbns) ? t.isbns : []);
        console.log(`[admin/cms PATCH] themeCuration "${t.title}" books=${books.length} isbns=${isbns.length}`);
        if (books.length > 0) console.log(`  첫번째 book:`, JSON.stringify(books[0]));
        return { ...t, isbns, books };
      });
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: '수정할 필드가 없습니다. featuredBooks, heroBanners, popups, storeHeroImage, mainBottomLeft, mainBottomRight, monthlyPick, themeCurations, selectedBooks, selectedBooksBanner 중 하나 이상을 포함해 주세요.' },
        { status: 400 },
      );
    }
    await ref.set(updates, { merge: true });
    invalidateCmsHomeMemCache();
    invalidate('cms', 'home');
    invalidate('home', 'home-data');
    revalidateTag(CMS_HOME_CACHE_TAG);
    revalidatePath('/', 'page');
    revalidatePath('/curation', 'page');
    revalidatePath('/selected-books', 'page');
    revalidatePath('/admin/marketing');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/cms PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
