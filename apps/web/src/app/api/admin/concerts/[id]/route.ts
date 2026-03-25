import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { CMS_HOME_CACHE_TAG } from '@/lib/cache-tags';
import { adminAuth } from '@/lib/firebase/admin';
import { invalidateCmsHomeMemCache } from '@/lib/store/home';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';
import type { Json } from '@/lib/supabase/types';

function extractError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null) {
    const o = e as Record<string, unknown>;
    return [o.message, o.details, o.hint].filter(Boolean).join(' | ') || JSON.stringify(o);
  }
  return String(e);
}

function isMissingOptionalConcertColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const text = [record.code, record.message, record.details, record.hint].filter(Boolean).join(' ');
  return text.includes('archive_title') || text.includes('event_card_image_url') || text.includes('42703');
}

export const dynamic = 'force-dynamic';

function revalidateConcertStore(slug?: string) {
  invalidateCmsHomeMemCache();
  revalidateTag(CMS_HOME_CACHE_TAG);
  revalidatePath('/', 'page');
  revalidatePath('/concerts', 'page');
  if (slug) revalidatePath(`/concerts/${slug}`, 'page');
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => asString(item).trim()).filter(Boolean) : [];
}

function asTableRows(value: unknown): Json {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const item = row as { label?: unknown; value?: unknown };
      return {
        label: asString(item.label).trim(),
        value: asString(item.value).trim(),
      };
    })
    .filter((row) => row.label || row.value) as Json;
}

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  const raw = asString(value).trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildConcertTitle(date: string | null, rawTitle: string): string {
  const title = rawTitle.trim();
  if (title) return title;
  if (!date) return '북콘서트';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '북콘서트';
  return `${value.getMonth() + 1}월 ${value.getDate()}일 북콘서트`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function buildConcertSlug(date: string | null, rawSlug: string, title: string): string {
  const slug = rawSlug.trim();
  if (slug) return slug;
  if (date) {
    const value = new Date(date);
    if (!Number.isNaN(value.getTime())) {
      const yyyy = value.getFullYear();
      const mm = String(value.getMonth() + 1).padStart(2, '0');
      const dd = String(value.getDate()).padStart(2, '0');
      return `concert-${yyyy}${mm}${dd}`;
    }
  }
  return slugify(title) || `concert-${Date.now()}`;
}

async function ensureUniqueSlug(baseSlug: string, currentId: string): Promise<string> {
  let candidate = baseSlug || `concert-${Date.now()}`;
  let index = 1;

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('concerts')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data || data.id === currentId) return candidate;

    candidate = `${baseSlug}-${index}`;
    index += 1;
  }
}

async function upsertEventFromConcert(params: {
  concertId: string;
  title: string;
  imageUrl: string;
  description: string;
  date: string | null;
  isActive: boolean;
}) {
  const { concertId, title, imageUrl, description, date, isActive } = params;
  const { data: existingEvent, error: existingError } = await supabaseAdmin
    .from('events')
    .select('event_id')
    .eq('event_id', concertId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingEvent) return;

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from('events').insert({
    event_id: concertId,
    title,
    description,
    image_url: imageUrl,
    type: 'book_concert',
    date,
    location: '네이버 예약',
    capacity: 0,
    registered_count: 0,
    is_active: isActive,
    updated_at: now,
    created_at: now,
  });

  if (error) throw error;
}

async function requireAdmin(request: Request): Promise<{ error: NextResponse } | { uid: string }> {
  const authHeader = request.headers.get('authorization');
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken || !adminAuth) {
    return { error: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }) };
  }
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return { error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) };
    }
    return { uid: decoded.uid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[requireAdmin] verifyIdToken failed:', msg);
    return { error: NextResponse.json({ error: `AUTH_ERROR: ${msg}` }, { status: 401 }) };
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;

    const update: Record<string, unknown> = {};
    const normalizedDate = 'date' in body ? normalizeDate(body.date) : null;
    const hasTitle = 'title' in body;
    const hasSlug = 'slug' in body;

    let resolvedTitle = '';
    if (hasTitle || hasSlug || 'date' in body) {
      resolvedTitle = buildConcertTitle(normalizedDate, hasTitle ? asString(body.title) : '');
      update.title = resolvedTitle;
      update.slug = await ensureUniqueSlug(
        buildConcertSlug(normalizedDate, hasSlug ? asString(body.slug) : '', resolvedTitle),
        id,
      );
    }

    if ('isActive' in body) update.is_active = body.isActive;
    if ('archiveTitle' in body) update.archive_title = asString(body.archiveTitle).trim() || null;
    if ('imageUrl' in body) update.image_url = asString(body.imageUrl).trim();
    if ('eventCardImageUrl' in body) update.event_card_image_url = asString(body.eventCardImageUrl).trim();
    if ('tableRows' in body) update.table_rows = asTableRows(body.tableRows);
    if ('bookIsbns' in body) update.book_isbns = asStringArray(body.bookIsbns);
    if ('description' in body) update.description = asString(body.description);
    if ('googleMapsEmbedUrl' in body) update.google_maps_embed_url = asString(body.googleMapsEmbedUrl).trim();
    if ('bookingUrl' in body) update.booking_url = asString(body.bookingUrl).trim();
    if ('bookingLabel' in body) update.booking_label = asString(body.bookingLabel);
    if ('bookingNoticeTitle' in body) update.booking_notice_title = asString(body.bookingNoticeTitle);
    if ('bookingNoticeBody' in body) update.booking_notice_body = asString(body.bookingNoticeBody);
    if ('feeLabel' in body) update.fee_label = asString(body.feeLabel);
    if ('feeNote' in body) update.fee_note = asString(body.feeNote);
    if ('hostNote' in body) update.host_note = asString(body.hostNote);
    if ('statusBadge' in body) update.status_badge = asString(body.statusBadge);
    if ('ticketPrice' in body) update.ticket_price = Math.max(0, Number(body.ticketPrice ?? 0));
    if ('ticketOpen' in body) update.ticket_open = Boolean(body.ticketOpen);
    if ('reviewYoutubeIds' in body) update.review_youtube_ids = asStringArray(body.reviewYoutubeIds);
    if ('date' in body) update.date = normalizedDate;
    if ('order' in body) update.order = Number(body.order ?? 0);
    update.updated_at = new Date().toISOString();

    let updateResult = await supabaseAdmin
      .from('concerts')
      .update(update)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (updateResult.error && isMissingOptionalConcertColumn(updateResult.error)) {
      const { archive_title: _archiveTitle, event_card_image_url: _eventCardImageUrl, ...fallbackUpdate } = update;
      updateResult = await supabaseAdmin
        .from('concerts')
        .update(fallbackUpdate)
        .eq('id', id)
        .select('*')
        .maybeSingle();
    }

    const { data, error } = updateResult;
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const concert = mapConcertRow(data);
    await upsertEventFromConcert({
      concertId: id,
      title: resolvedTitle || concert.title,
      imageUrl: concert.imageUrl,
      description: concert.description,
      date: concert.date,
      isActive: concert.isActive,
    });

    revalidateConcertStore(concert.slug || id);

    return NextResponse.json(concert);
  } catch (e) {
    const msg = extractError(e);
    console.error('[api/admin/concerts/[id] PATCH]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const { data: existingConcert } = await supabaseAdmin
      .from('concerts')
      .select('slug')
      .eq('id', id)
      .maybeSingle();

    const { error: deleteRegistrationsError } = await supabaseAdmin
      .from('event_registrations')
      .delete()
      .eq('event_id', id);
    if (deleteRegistrationsError) throw deleteRegistrationsError;

    const { error: deleteEventError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('event_id', id);
    if (deleteEventError) throw deleteEventError;

    const { error } = await supabaseAdmin.from('concerts').delete().eq('id', id);
    if (error) throw error;

    revalidateConcertStore(String(existingConcert?.slug ?? id));

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = extractError(e);
    console.error('[api/admin/concerts/[id] DELETE]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
