import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getStoreSettings } from '@/lib/store-settings.server';

export const dynamic = 'force-dynamic';

function isWithinReturnPeriod(deliveredAt: string | null, returnPeriodDays: number): boolean {
  if (!deliveredAt) return false;
  const delivered = new Date(deliveredAt);
  if (Number.isNaN(delivered.getTime())) return false;
  const diffDays = (Date.now() - delivered.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= returnPeriodDays;
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
      .select('order_id, user_id, status, shipping_status, delivered_at, return_status')
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
    if (order.return_status === 'requested') {
      return NextResponse.json({ error: 'ALREADY_REQUESTED' }, { status: 400 });
    }
    if (order.return_status === 'completed') {
      return NextResponse.json({ error: 'RETURN_ALREADY_COMPLETED' }, { status: 400 });
    }
    const storeSettings = await getStoreSettings();
    if (!isWithinReturnPeriod(order.delivered_at, storeSettings.returnPeriodDays)) {
      return NextResponse.json({ error: 'RETURN_PERIOD_EXPIRED' }, { status: 400 });
    }

    const returnReason = typeof body.returnReason === 'string' ? body.returnReason.slice(0, 500) : null;
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'return_requested',
        return_status: 'requested',
        return_reason: returnReason,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);

    if (updateError) {
      return NextResponse.json({ error: 'RETURN_REQUEST_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ success: true, orderId });
  } catch (e) {
    console.error('[api/order/return]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
