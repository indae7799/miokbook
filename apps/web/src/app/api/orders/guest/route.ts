import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

    const matchedName = typeof shippingAddress.name === 'string' && shippingAddress.name === orderName;
    const matchedPhone = normalizePhone(typeof shippingAddress.phone === 'string' ? shippingAddress.phone : '') === orderPhone;

    if (!matchedName || !matchedPhone) {
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
