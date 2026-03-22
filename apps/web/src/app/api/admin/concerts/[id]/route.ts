import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';
import type { Json } from '@/lib/supabase/types';

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
    if ('title' in body) update.title = body.title;
    if ('slug' in body) update.slug = body.slug;
    if ('isActive' in body) update.is_active = body.isActive;
    if ('imageUrl' in body) update.image_url = body.imageUrl;
    if ('tableRows' in body) update.table_rows = (body.tableRows ?? []) as Json;
    if ('bookIsbns' in body) update.book_isbns = body.bookIsbns;
    if ('description' in body) update.description = body.description;
    if ('googleMapsEmbedUrl' in body) update.google_maps_embed_url = body.googleMapsEmbedUrl;
    if ('bookingUrl' in body) update.booking_url = body.bookingUrl;
    if ('bookingLabel' in body) update.booking_label = body.bookingLabel;
    if ('bookingNoticeTitle' in body) update.booking_notice_title = body.bookingNoticeTitle;
    if ('bookingNoticeBody' in body) update.booking_notice_body = body.bookingNoticeBody;
    if ('feeLabel' in body) update.fee_label = body.feeLabel;
    if ('feeNote' in body) update.fee_note = body.feeNote;
    if ('hostNote' in body) update.host_note = body.hostNote;
    if ('statusBadge' in body) update.status_badge = body.statusBadge;
    if ('ticketPrice' in body) update.ticket_price = Math.max(0, Number(body.ticketPrice ?? 0));
    if ('ticketOpen' in body) update.ticket_open = Boolean(body.ticketOpen);
    if ('date' in body) update.date = body.date ? new Date(body.date as string).toISOString() : null;
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
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/admin/concerts/[id] PATCH]', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/admin/concerts/[id] DELETE]', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
