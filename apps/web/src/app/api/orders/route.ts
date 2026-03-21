import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const list = (data ?? []).map((row) => ({
      id: row.order_id,
      orderId: row.order_id,
      status: row.status,
      shippingStatus: row.shipping_status,
      items: row.items ?? [],
      totalPrice: row.total_price,
      shippingFee: row.shipping_fee,
      shippingAddress: row.shipping_address,
      createdAt: row.created_at ?? null,
      paidAt: row.paid_at ?? null,
      deliveredAt: row.delivered_at ?? null,
      returnStatus: row.return_status ?? 'none',
      returnReason: row.return_reason ?? null,
    }));

    return NextResponse.json(list);
  } catch (e) {
    console.error('[api/orders GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
