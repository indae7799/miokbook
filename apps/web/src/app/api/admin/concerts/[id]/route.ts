import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
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

export const dynamic = 'force-dynamic';

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

    if (hasTitle || hasSlug || 'date' in body) {
      const title = buildConcertTitle(normalizedDate, hasTitle ? asString(body.title) : '');
      update.title = title;
      update.slug = await ensureUniqueSlug(
        buildConcertSlug(normalizedDate, hasSlug ? asString(body.slug) : '', title),
        id,
      );
    }

    if ('isActive' in body) update.is_active = body.isActive;
    if ('imageUrl' in body) update.image_url = asString(body.imageUrl).trim();
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

    const { data, error } = await supabaseAdmin
      .from('concerts')
      .update(update)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(mapConcertRow(data));
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
    const { error } = await supabaseAdmin.from('concerts').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = extractError(e);
    console.error('[api/admin/concerts/[id] DELETE]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
