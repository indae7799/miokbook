import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { CMS_HOME_CACHE_TAG } from '@/lib/cache-tags';
import { adminAuth } from '@/lib/firebase/admin';
import { invalidateCmsHomeMemCache } from '@/lib/store/home';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';

function extractError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    return [record.message, record.details, record.hint].filter(Boolean).join(' | ') || JSON.stringify(record);
  }
  return String(error);
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

function asTableRows(value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const item = row as { label?: unknown; value?: unknown };
      return {
        label: asString(item.label).trim(),
        value: asString(item.value).trim(),
      };
    })
    .filter((row) => row.label || row.value);
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

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let candidate = baseSlug || `concert-${Date.now()}`;
  let index = 1;

  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('concerts')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;

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
  const now = new Date().toISOString();
  const { data: existingEvent, error: existingError } = await supabaseAdmin
    .from('events')
    .select('event_id')
    .eq('event_id', concertId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingEvent) {
    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({
        title,
        description,
        image_url: imageUrl,
        date,
        is_active: isActive,
        updated_at: now,
      })
      .eq('event_id', concertId);

    if (updateError) throw updateError;
    return;
  }

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

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const { data, error } = await supabaseAdmin.from('concerts').select('*');
    if (error) throw error;

    const concerts = (data ?? [])
      .map(mapConcertRow)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

    return NextResponse.json(concerts);
  } catch (error) {
    const message = extractError(error);
    console.error('[api/admin/concerts GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const body = await request.json() as Record<string, unknown>;
    const now = new Date().toISOString();
    const normalizedDate = normalizeDate(body.date);
    const title = buildConcertTitle(normalizedDate, asString(body.title));
    const baseSlug = buildConcertSlug(normalizedDate, asString(body.slug), title);
    const slug = await ensureUniqueSlug(baseSlug);
    const id = randomUUID();

    const payload = {
      id,
      title,
      archive_title: asString(body.archiveTitle).trim() || null,
      slug,
      is_active: Boolean(body.isActive),
      image_url: asString(body.imageUrl).trim(),
      event_card_image_url: asString(body.eventCardImageUrl).trim(),
      table_rows: asTableRows(body.tableRows),
      book_isbns: asStringArray(body.bookIsbns),
      description: asString(body.description),
      google_maps_embed_url: asString(body.googleMapsEmbedUrl).trim(),
      booking_url: asString(body.bookingUrl).trim(),
      booking_label: asString(body.bookingLabel) || '예약 신청',
      booking_notice_title: asString(body.bookingNoticeTitle) || '',
      booking_notice_body: asString(body.bookingNoticeBody) || '',
      fee_label: asString(body.feeLabel),
      fee_note: asString(body.feeNote),
      host_note: asString(body.hostNote),
      status_badge: asString(body.statusBadge),
      ticket_price: Math.max(0, Number(body.ticketPrice ?? 0)),
      ticket_open: Boolean(body.ticketOpen),
      review_youtube_ids: asStringArray(body.reviewYoutubeIds),
      date: normalizedDate,
      order: Number(body.order ?? 0),
      created_at: now,
      updated_at: now,
    };

    let insertResult = await supabaseAdmin
      .from('concerts')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (insertResult.error && isMissingOptionalConcertColumn(insertResult.error)) {
      const { archive_title: _archiveTitle, event_card_image_url: _eventCardImageUrl, ...fallbackPayload } = payload;
      insertResult = await supabaseAdmin
        .from('concerts')
        .insert(fallbackPayload)
        .select('*')
        .maybeSingle();
    }

    const { data, error } = insertResult;
    if (error) throw error;
    if (!data) throw new Error('Insert succeeded but no data returned');
    const eventTitle = payload.archive_title ? String(payload.archive_title) : title;

    await upsertEventFromConcert({
      concertId: id,
      title: eventTitle,
      imageUrl: payload.image_url,
      description: payload.description,
      date: normalizedDate,
      isActive: payload.is_active,
    });

    revalidateConcertStore(slug);

    return NextResponse.json(mapConcertRow(data), { status: 201 });
  } catch (error) {
    const message = extractError(error);
    console.error('[api/admin/concerts POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
