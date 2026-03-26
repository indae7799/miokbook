import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { invalidateStoreBookListsAndHome } from '@/lib/invalidate-store-book-lists';
import { getPaymentProviderAdapter, mergeOrderPaymentMetadata, resolvePaymentProvider, resolvePaymentReference } from '@/lib/payments/resolver';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const attempts = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > RATE_LIMIT;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const orderId = body.orderId as string | undefined;
    if (!orderId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .is('user_id', null)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
    }
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, orderId, alreadyProcessed: true });
    }
    if (order.status !== 'pending') {
      return NextResponse.json({ success: true, orderId, alreadyProcessed: true });
    }

    const expiresTime = order.expires_at ? new Date(order.expires_at).getTime() : 0;
    if (!expiresTime || expiresTime <= Date.now()) {
      return NextResponse.json({ error: 'ORDER_EXPIRED' }, { status: 400 });
    }

    const expectedAmount = Number(order.payable_amount ?? (Number(order.total_price ?? 0) + Number(order.shipping_fee ?? 0)));
    const items = (Array.isArray(order.items) ? order.items : []) as Array<{ isbn?: string; quantity?: number }>;
    const now = new Date().toISOString();
    const provider = resolvePaymentProvider(order, body.provider);
    const paymentReference = resolvePaymentReference(body as Record<string, unknown>, provider);
    if (!paymentReference) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }
    const providerAdapter = getPaymentProviderAdapter(provider);

    const confirmed = await providerAdapter.confirmPayment({
      orderId,
      amount: expectedAmount,
      paymentReference,
      rawRequest: body as Record<string, unknown>,
    });
    const persistedPaymentReference = confirmed.externalPaymentId ?? paymentReference;
    if (!confirmed.ok) {
      for (const item of items) {
        const isbn = String(item.isbn ?? '');
        const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
        if (!isbn) continue;
        const { data: inventoryRow } = await supabaseAdmin.from('inventory').select('*').eq('isbn', isbn).maybeSingle();
        await supabaseAdmin.from('inventory').upsert({
          isbn,
          stock: Number(inventoryRow?.stock ?? 0),
          reserved: Math.max(0, Number(inventoryRow?.reserved ?? 0) - qty),
          updated_at: now,
        });
      }
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'failed',
          shipping_address: mergeOrderPaymentMetadata(order.shipping_address, { provider, paymentReference: persistedPaymentReference }),
          updated_at: now,
        })
        .eq('order_id', orderId);
      return NextResponse.json({ error: confirmed.errorCode || 'PAYMENT_FAILED' }, { status: 400 });
    }

    for (const item of items) {
      const isbn = String(item.isbn ?? '');
      const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
      if (!isbn) continue;

      const [{ data: inventoryRow }, { data: bookRow }] = await Promise.all([
        supabaseAdmin.from('inventory').select('*').eq('isbn', isbn).maybeSingle(),
        supabaseAdmin.from('books').select('sales_count').eq('isbn', isbn).maybeSingle(),
      ]);

      await supabaseAdmin.from('inventory').upsert({
        isbn,
        stock: Math.max(0, Number(inventoryRow?.stock ?? 0) - qty),
        reserved: Math.max(0, Number(inventoryRow?.reserved ?? 0) - qty),
        updated_at: now,
      });

      await supabaseAdmin.from('books').update({
        sales_count: Number(bookRow?.sales_count ?? 0) + qty,
        updated_at: now,
      }).eq('isbn', isbn);
    }

    await supabaseAdmin.from('orders').update({
      status: 'paid',
      payment_key: persistedPaymentReference,
      shipping_address: mergeOrderPaymentMetadata(order.shipping_address, { provider, paymentReference: persistedPaymentReference }),
      paid_at: now,
      updated_at: now,
    }).eq('order_id', orderId);

    invalidateStoreBookListsAndHome();

    return NextResponse.json({ success: true, orderId });
  } catch (e) {
    console.error('[api/payment/guest-confirm]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
