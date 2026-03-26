import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const EXCHANGE_DEADLINE_DAYS = 7;

function isWithinExchangePeriod(deliveredAt: string | null): boolean {
  if (!deliveredAt) return false;
  const delivered = new Date(deliveredAt);
  if (Number.isNaN(delivered.getTime())) return false;
  const diffDays = (Date.now() - delivered.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= EXCHANGE_DEADLINE_DAYS;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth || !supabaseAdmin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);

    const body = await request.json().catch(() => ({}));
    const orderId = body.orderId as string | undefined;
    if (!orderId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('order_id, user_id, status, shipping_status, delivered_at')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
    }
    if (order.user_id !== decoded.uid) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (order.status !== 'paid') {
      return NextResponse.json({ error: 'ORDER_NOT_PAID' }, { status: 400 });
    }
    if (order.shipping_status !== 'delivered') {
      return NextResponse.json({ error: 'SHIPPING_NOT_DELIVERED' }, { status: 400 });
    }
    if (order.status === 'exchange_requested') {
      return NextResponse.json({ error: 'ALREADY_REQUESTED' }, { status: 400 });
    }
    if (order.status === 'exchange_completed') {
      return NextResponse.json({ error: 'EXCHANGE_ALREADY_COMPLETED' }, { status: 400 });
    }
    if (String(order.status).startsWith('return_')) {
      return NextResponse.json({ error: 'ALREADY_RETURN_PROCESS' }, { status: 400 });
    }
    if (!isWithinExchangePeriod(order.delivered_at)) {
      return NextResponse.json({ error: 'EXCHANGE_PERIOD_EXPIRED' }, { status: 400 });
    }

    const exchangeReason = typeof body.exchangeReason === 'string' ? body.exchangeReason.slice(0, 500) : null;
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'exchange_requested',
        exchange_reason: exchangeReason,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    if (updateError) {
      return NextResponse.json({ error: 'EXCHANGE_REQUEST_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ success: true, orderId });
  } catch (e) {
    console.error('[api/order/exchange]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
