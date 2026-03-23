import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const EXPIRES_MINUTES = 30;

function parsePriceLabel(label: string): number {
  const digits = label.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const body = await request.json().catch(() => ({}));
    const concertId = String(body.concertId ?? '').trim();
    const quantity = Math.min(20, Math.max(1, Number(body.quantity) || 1));

    if (!concertId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { data: concert, error } = await supabaseAdmin
      .from('concerts')
      .select('id, title, slug, is_active, ticket_price, ticket_open, fee_label')
      .eq('id', concertId)
      .maybeSingle();

    if (error || !concert || !concert.is_active) {
      return NextResponse.json({ error: 'CONCERT_NOT_FOUND' }, { status: 404 });
    }

    const ticketPrice = Math.max(0, Number(concert.ticket_price ?? 0)) || parsePriceLabel(String(concert.fee_label ?? ''));
    const ticketOpen = Boolean(concert.ticket_open) || ticketPrice > 0;
    if (!ticketOpen || ticketPrice <= 0) {
      return NextResponse.json({ error: 'TICKET_NOT_AVAILABLE' }, { status: 400 });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + EXPIRES_MINUTES * 60 * 1000).toISOString();
    const orderId = crypto.randomUUID();

    const items = [
      {
        type: 'concert_ticket',
        concertId: concert.id,
        concertSlug: String(concert.slug ?? concert.id ?? ''),
        title: `${String(concert.title ?? '')} 참가권`,
        quantity,
        unitPrice: ticketPrice,
      },
    ];

    const { error: insertError } = await supabaseAdmin.from('orders').insert({
      order_id: orderId,
      user_id: decoded.uid,
      status: 'pending',
      shipping_status: 'ready',
      items,
      total_price: ticketPrice * quantity,
      shipping_fee: 0,
      shipping_address: null,
      payment_key: null,
      created_at: nowIso,
      updated_at: nowIso,
      expires_at: expiresAt,
      paid_at: null,
      cancelled_at: null,
      delivered_at: null,
      return_status: 'none',
      return_reason: null,
    });

    if (insertError) throw insertError;

    return NextResponse.json({
      orderId,
      totalPrice: ticketPrice * quantity,
      shippingFee: 0,
      expiresAt,
    });
  } catch (e) {
    console.error('[api/concert-orders/create]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
