import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const orderName = searchParams.get('orderName');

    if (!orderId || !orderName) {
      return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('order_id, status, shipping_status, items, total_price, shipping_fee, shipping_address, created_at, delivered_at')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error) {
      console.error('[api/orders/guest GET] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const shippingAddress =
      order.shipping_address && typeof order.shipping_address === 'object' && !Array.isArray(order.shipping_address)
        ? (order.shipping_address as Record<string, unknown>)
        : {};

    if (shippingAddress.name !== orderName) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      orderId: order.order_id,
      status: order.status,
      shippingStatus: order.shipping_status,
      items: Array.isArray(order.items) ? order.items : [],
      totalPrice: order.total_price,
      shippingFee: order.shipping_fee,
      shippingAddress: {
        name: typeof shippingAddress.name === 'string' ? shippingAddress.name : '',
        address: typeof shippingAddress.address === 'string' ? shippingAddress.address : '',
      },
      createdAt: order.created_at ?? null,
      deliveredAt: order.delivered_at ?? null,
    });
  } catch (e) {
    console.error('[api/orders/guest GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
