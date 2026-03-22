import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';

export const dynamic = 'force-dynamic';

async function requireAdmin(request: Request): Promise<{ error: NextResponse } | { uid: string }> {
  const authHeader = request.headers.get('authorization');
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken || !adminAuth) {
    return { error: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }) };
  }
  const decoded = await adminAuth.verifyIdToken(idToken);
  if ((decoded as { role?: string }).role !== 'admin') {
    return { error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) };
  }
  return { uid: decoded.uid };
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/admin/concerts GET]', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) return auth.error;

    const body = await request.json() as {
      title?: string;
      slug?: string;
      isActive?: boolean;
      imageUrl?: string;
      tableRows?: { label: string; value: string }[];
      bookIsbns?: string[];
      description?: string;
      googleMapsEmbedUrl?: string;
      bookingUrl?: string;
      bookingLabel?: string;
      bookingNoticeTitle?: string;
      bookingNoticeBody?: string;
      feeLabel?: string;
      feeNote?: string;
      hostNote?: string;
      statusBadge?: string;
      ticketPrice?: number;
      ticketOpen?: boolean;
      date?: string | null;
      order?: number;
    };

    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('concerts')
      .insert({
        title: body.title ?? '',
        slug: body.slug ?? '',
        is_active: body.isActive ?? false,
        image_url: body.imageUrl ?? '',
        table_rows: body.tableRows ?? [],
        book_isbns: body.bookIsbns ?? [],
        description: body.description ?? '',
        google_maps_embed_url: body.googleMapsEmbedUrl ?? '',
        booking_url: body.bookingUrl ?? '',
        booking_label: body.bookingLabel ?? '신청하기',
        booking_notice_title: body.bookingNoticeTitle ?? '예약 안내',
        booking_notice_body: body.bookingNoticeBody ?? '북콘서트 신청은 외부 예약 페이지에서 진행됩니다.',
        fee_label: body.feeLabel ?? '',
        fee_note: body.feeNote ?? '',
        host_note: body.hostNote ?? '',
        status_badge: body.statusBadge ?? '',
        ticket_price: Math.max(0, Number(body.ticketPrice ?? 0)),
        ticket_open: Boolean(body.ticketOpen ?? false),
        date: body.date ? new Date(body.date).toISOString() : null,
        order: Number(body.order ?? 0),
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json(mapConcertRow(data), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/admin/concerts POST]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
