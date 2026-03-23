import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { adminAuth } from '@/lib/firebase/admin';
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

export const dynamic = 'force-dynamic';

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

    const payload = {
      id: randomUUID(),
      title: asString(body.title).trim(),
      slug: asString(body.slug).trim(),
      is_active: Boolean(body.isActive),
      image_url: asString(body.imageUrl).trim(),
      table_rows: asTableRows(body.tableRows),
      book_isbns: asStringArray(body.bookIsbns),
      description: asString(body.description),
      google_maps_embed_url: asString(body.googleMapsEmbedUrl).trim(),
      booking_url: asString(body.bookingUrl).trim(),
      booking_label: asString(body.bookingLabel) || '신청하기',
      booking_notice_title: asString(body.bookingNoticeTitle) || '예약 안내',
      booking_notice_body: asString(body.bookingNoticeBody) || '북콘서트 신청은 예약 페이지에서 진행됩니다.',
      fee_label: asString(body.feeLabel),
      fee_note: asString(body.feeNote),
      host_note: asString(body.hostNote),
      status_badge: asString(body.statusBadge),
      ticket_price: Math.max(0, Number(body.ticketPrice ?? 0)),
      ticket_open: Boolean(body.ticketOpen),
      review_youtube_ids: asStringArray(body.reviewYoutubeIds),
      date: normalizeDate(body.date),
      order: Number(body.order ?? 0),
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabaseAdmin
      .from('concerts')
      .insert(payload)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Insert succeeded but no data returned');

    return NextResponse.json(mapConcertRow(data), { status: 201 });
  } catch (error) {
    const message = extractError(error);
    console.error('[api/admin/concerts POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
