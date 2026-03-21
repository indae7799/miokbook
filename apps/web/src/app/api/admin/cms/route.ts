import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { adminAuth } from '@/lib/firebase/admin';
import { invalidate } from '@/lib/firestore-cache';
import { CMS_HOME_CACHE_TAG } from '@/lib/cache-tags';
import { clampStoredPopupDimensions } from '@/lib/popup-dimensions';
import { invalidateCmsHomeMemCache } from '@/lib/store/home';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { extractCmsValue } from '@/lib/supabase/mappers';
import type { Json } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

function toIso(d: unknown): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;
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
    endDate: popup.endDate && typeof popup.endDate === 'string' ? new Date(popup.endDate).toISOString() : popup.endDate,
    slotIndex: Number(popup.slotIndex ?? 0),
    widthPx,
    heightPx,
  };
}

const emptyCmsResponse = (degraded?: boolean) => ({
  heroBanners: [],
  featuredBooks: [],
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

async function loadHomeCms() {
  const { data, error } = await supabaseAdmin
    .from('cms')
    .select('value, updated_at')
    .eq('key', 'home')
    .maybeSingle();

  if (error) throw error;
  return data;
}

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

    let row;
    try {
      row = await loadHomeCms();
    } catch (readErr) {
      console.error('[admin/cms GET] Supabase read failed', readErr);
      return NextResponse.json(emptyCmsResponse(true));
    }

    if (!row) {
      return NextResponse.json(emptyCmsResponse());
    }

    const d = extractCmsValue(row.value);
    const storeHeroImage = d.storeHeroImage && typeof d.storeHeroImage === 'object'
      ? { imageUrl: (d.storeHeroImage as Record<string, unknown>).imageUrl ?? '', linkUrl: (d.storeHeroImage as Record<string, unknown>).linkUrl ?? '/' }
      : null;
    const mainBottomLeft = typeof d.mainBottomLeft === 'object' && d.mainBottomLeft && String((d.mainBottomLeft as Record<string, unknown>).imageUrl ?? '').trim()
      ? { imageUrl: (d.mainBottomLeft as Record<string, unknown>).imageUrl, linkUrl: (d.mainBottomLeft as Record<string, unknown>).linkUrl ?? '/' }
      : null;
    const mainBottomRight = typeof d.mainBottomRight === 'object' && d.mainBottomRight && String((d.mainBottomRight as Record<string, unknown>).imageUrl ?? '').trim()
      ? { imageUrl: (d.mainBottomRight as Record<string, unknown>).imageUrl, linkUrl: (d.mainBottomRight as Record<string, unknown>).linkUrl ?? '/' }
      : null;
    const aboutBookstoreImage = typeof d.aboutBookstoreImage === 'object' && d.aboutBookstoreImage && String((d.aboutBookstoreImage as Record<string, unknown>).imageUrl ?? '').trim()
      ? { imageUrl: (d.aboutBookstoreImage as Record<string, unknown>).imageUrl, linkUrl: (d.aboutBookstoreImage as Record<string, unknown>).linkUrl ?? '/bulk-order' }
      : null;
    const meetingAtBookstoreImage = typeof d.meetingAtBookstoreImage === 'object' && d.meetingAtBookstoreImage && String((d.meetingAtBookstoreImage as Record<string, unknown>).imageUrl ?? '').trim()
      ? { imageUrl: (d.meetingAtBookstoreImage as Record<string, unknown>).imageUrl }
      : null;
    const featuredBooks = Array.isArray(d.featuredBooks) ? d.featuredBooks.map((b) => ({
      isbn: (b as Record<string, unknown>).isbn,
      title: (b as Record<string, unknown>).title,
      coverImage: (b as Record<string, unknown>).coverImage,
      priority: Number((b as Record<string, unknown>).priority ?? 0),
      recommendationText: (b as Record<string, unknown>).recommendationText ?? '',
    })) : [];
    const heroBanners = Array.isArray(d.heroBanners) ? d.heroBanners.map((b) => ({
      ...(b as Record<string, unknown>),
      startDate: toIso((b as Record<string, unknown>).startDate),
      endDate: toIso((b as Record<string, unknown>).endDate),
    })) : [];
    const themeCurations = Array.isArray(d.themeCurations) ? d.themeCurations : [];
    const selectedBooks = typeof d.selectedBooks === 'object' && d.selectedBooks && !Array.isArray(d.selectedBooks) ? d.selectedBooks : {};
    const selectedBooksBannerRaw = d.selectedBooksBanner;
    const selectedBooksBanner = selectedBooksBannerRaw && typeof selectedBooksBannerRaw === 'object' && String((selectedBooksBannerRaw as Record<string, unknown>).imageUrl ?? '').trim()
      ? { imageUrl: (selectedBooksBannerRaw as Record<string, unknown>).imageUrl, linkUrl: (selectedBooksBannerRaw as Record<string, unknown>).linkUrl ?? '/' }
      : null;
    const popups = (
      Array.isArray(d.popups)
        ? d.popups
        : (d.popup ? [d.popup] : [])
    )
      .map((popup) => normalizePopupForResponse(popup as Record<string, unknown>))
      .sort((a, b) => Number(a.slotIndex ?? 0) - Number(b.slotIndex ?? 0));
    const popup = popups[0] ?? null;

    return NextResponse.json({
      heroBanners,
      featuredBooks,
      themeCurations,
      selectedBooks,
      selectedBooksBanner,
      storeHeroImage,
      mainBottomLeft,
      mainBottomRight,
      aboutBookstoreImage,
      meetingAtBookstoreImage,
      popup,
      popups,
      updatedAt: row.updated_at ?? null,
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: '요청 본문은 객체여야 합니다.' }, { status: 400 });
    }

    const existing = await loadHomeCms().catch(() => null);
    const currentValue = extractCmsValue(existing?.value);
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (Array.isArray(body.featuredBooks)) updates.featuredBooks = body.featuredBooks;
    if (Array.isArray(body.heroBanners)) {
      updates.heroBanners = body.heroBanners.map((b: Record<string, unknown>) => {
        const startDate = b.startDate && typeof b.startDate === 'string' ? new Date(b.startDate).toISOString() : b.startDate;
        const endDate = b.endDate && typeof b.endDate === 'string' ? new Date(b.endDate).toISOString() : b.endDate;
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
        .sort((a, b) => Number(a.slotIndex ?? 0) - Number(b.slotIndex ?? 0));
      updates.popups = popups;
      updates.popup = popups[0] ?? null;
    } else if (body.popup !== undefined && typeof body.popup === 'object') {
      const popup = normalizePopupForWrite(body.popup as Record<string, unknown>);
      updates.popup = popup;
      updates.popups = popup ? [popup] : [];
    }
    if (body.storeHeroImage !== undefined) {
      const sh = body.storeHeroImage as { imageUrl?: unknown; linkUrl?: unknown } | undefined;
      const url = sh && typeof sh === 'object' ? String(sh.imageUrl ?? '').trim() : '';
      updates.storeHeroImage = url ? { imageUrl: url, linkUrl: (sh && String(sh.linkUrl ?? '/').trim()) || '/' } : null;
    }
    if (body.mainBottomLeft !== undefined) {
      const m = body.mainBottomLeft as { imageUrl?: unknown; linkUrl?: unknown } | undefined;
      const url = m && typeof m === 'object' ? String(m.imageUrl ?? '').trim() : '';
      updates.mainBottomLeft = url ? { imageUrl: url, linkUrl: (m && String(m.linkUrl ?? '/').trim()) || '/' } : null;
    }
    if (body.mainBottomRight !== undefined) {
      const m = body.mainBottomRight as { imageUrl?: unknown; linkUrl?: unknown } | undefined;
      const url = m && typeof m === 'object' ? String(m.imageUrl ?? '').trim() : '';
      updates.mainBottomRight = url ? { imageUrl: url, linkUrl: (m && String(m.linkUrl ?? '/').trim()) || '/' } : null;
    }
    if (body.aboutBookstoreImage !== undefined) {
      const m = body.aboutBookstoreImage as { imageUrl?: unknown; linkUrl?: unknown } | undefined;
      const url = m && typeof m === 'object' ? String(m.imageUrl ?? '').trim() : '';
      updates.aboutBookstoreImage = url ? { imageUrl: url, linkUrl: (m && String(m.linkUrl ?? '/bulk-order').trim()) || '/bulk-order' } : null;
    }
    if (body.meetingAtBookstoreImage !== undefined) {
      const m = body.meetingAtBookstoreImage as { imageUrl?: unknown } | null | undefined;
      const url = m && typeof m === 'object' ? String(m.imageUrl ?? '').trim() : '';
      updates.meetingAtBookstoreImage = url ? { imageUrl: url } : null;
    }
    if (body.selectedBooks !== undefined && typeof body.selectedBooks === 'object' && !Array.isArray(body.selectedBooks)) {
      updates.selectedBooks = body.selectedBooks;
    }
    if (body.selectedBooksBanner !== undefined) {
      const sb = body.selectedBooksBanner as { imageUrl?: unknown; linkUrl?: unknown } | null | undefined;
      const url = sb && typeof sb === 'object' ? String(sb.imageUrl ?? '').trim() : '';
      updates.selectedBooksBanner = url ? { imageUrl: url, linkUrl: (sb && String(sb.linkUrl ?? '/').trim()) || '/' } : null;
    }
    if (Array.isArray(body.themeCurations)) {
      updates.themeCurations = body.themeCurations.map((t: Record<string, unknown>) => {
        const books = Array.isArray(t.books) ? t.books as { isbn: string }[] : [];
        const isbns = books.length > 0 ? books.map((b) => b.isbn) : (Array.isArray(t.isbns) ? t.isbns : []);
        return { ...t, isbns, books };
      });
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: '수정할 필드가 없습니다.' },
        { status: 400 },
      );
    }

    const nextValue = { ...currentValue, ...updates } as Json;
    const { error } = await supabaseAdmin.from('cms').upsert({
      key: 'home',
      value: nextValue,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    invalidateCmsHomeMemCache();
    invalidate('cms', 'home');
    invalidate('home', 'home-data');
    revalidateTag(CMS_HOME_CACHE_TAG);
    revalidatePath('/', 'page');
    revalidatePath('/curation', 'page');
    revalidatePath('/curation/md', 'page');
    revalidatePath('/selected-books', 'page');
    revalidatePath('/admin/marketing');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/cms PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
