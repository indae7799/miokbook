import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveDisplayOrderId } from '@/lib/order-id';

export const dynamic = 'force-dynamic';

const LOOKUP_LIMIT = 5;
const LOOKUP_WINDOW_MS = 60_000;
const lookupAttempts = new Map<string, number[]>();

function normalizePhone(value: string | null): string {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11);
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (lookupAttempts.get(key) ?? []).filter((time) => now - time < LOOKUP_WINDOW_MS);
  recent.push(now);
  lookupAttempts.set(key, recent);
  return recent.length > LOOKUP_LIMIT;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const orderName = searchParams.get('orderName');
    const orderPhone = normalizePhone(searchParams.get('orderPhone'));

    if (!orderId || !orderName || !orderPhone) {
      return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 400 });
    }

    const rateLimitKey = `${getClientIp(request)}:${orderId}`;
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('order_id, display_order_id, guest_phone, status, shipping_status, items, total_price, shipping_fee, promotion_discount, promotion_label, points_used, payable_amount, tracking_number, carrier, shipping_address, created_at, paid_at, delivered_at')
      .eq('guest_phone', orderPhone)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[api/orders/guest GET] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    const order = (orders ?? []).find((entry) => {
      const shippingAddress =
        entry.shipping_address && typeof entry.shipping_address === 'object' && !Array.isArray(entry.shipping_address)
          ? (entry.shipping_address as Record<string, unknown>)
          : {};
      const matchedName = typeof shippingAddress.name === 'string' && shippingAddress.name === orderName;
      const matchedOrderId =
        entry.order_id === orderId ||
        resolveDisplayOrderId(entry) === orderId;
      return matchedName && matchedOrderId;
    });

    if (!order) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const shippingAddress =
      order.shipping_address && typeof order.shipping_address === 'object' && !Array.isArray(order.shipping_address)
        ? (order.shipping_address as Record<string, unknown>)
        : {};

    const matchedPhone = normalizePhone(typeof shippingAddress.phone === 'string' ? shippingAddress.phone : '') === orderPhone;

    if (!matchedPhone) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      orderId: order.order_id,
      displayOrderId: resolveDisplayOrderId(order),
      status: order.status,
      shippingStatus: order.shipping_status ?? 'ready',
      items: Array.isArray(order.items) ? order.items : [],
      totalPrice: Number(order.total_price ?? 0),
      shippingFee: Number(order.shipping_fee ?? 0),
      promotionDiscount: Number(order.promotion_discount ?? 0),
      promotionLabel: typeof order.promotion_label === 'string' ? order.promotion_label : '',
      pointsUsed: Number(order.points_used ?? 0),
      payableAmount: Number(order.payable_amount ?? 0),
      trackingNumber: order.tracking_number ?? null,
      carrier: order.carrier ?? null,
      shippingAddress: {
        name: typeof shippingAddress.name === 'string' ? shippingAddress.name : '',
        phone: typeof shippingAddress.phone === 'string' ? shippingAddress.phone : '',
        address: typeof shippingAddress.address === 'string' ? shippingAddress.address : '',
        detailAddress: typeof shippingAddress.detailAddress === 'string' ? shippingAddress.detailAddress : '',
        deliveryMemo: typeof shippingAddress.deliveryMemo === 'string' ? shippingAddress.deliveryMemo : '',
      },
      createdAt: order.created_at ?? null,
      paidAt: order.paid_at ?? null,
      deliveredAt: order.delivered_at ?? null,
    });
  } catch (e) {
    console.error('[api/orders/guest GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
