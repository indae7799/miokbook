import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { invalidateStoreBookListsAndHome } from '@/lib/invalidate-store-book-lists';
import { appendMileageLedger } from '@/lib/mileage-ledger';
import { getPaymentProviderAdapter, mergeOrderPaymentMetadata, resolvePaymentProvider } from '@/lib/payments/resolver';

export const dynamic = 'force-dynamic';

type OrderItem = { isbn?: string; quantity?: number };

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

    const { data: order, error } = await supabaseAdmin.from('orders').select('*').eq('order_id', orderId).maybeSingle();
    if (error || !order) {
      return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
    }
    if (order.user_id !== decoded.uid) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (order.status === 'cancelled_by_customer') {
      return NextResponse.json({ success: true, orderId, alreadyProcessed: true });
    }
    if (order.status !== 'paid') {
      return NextResponse.json({ error: 'ORDER_NOT_PAID' }, { status: 400 });
    }
    if (order.shipping_status !== 'ready') {
      return NextResponse.json({ error: 'SHIPPING_ALREADY_SENT' }, { status: 400 });
    }
    if (!order.payment_key) {
      return NextResponse.json({ error: 'PAYMENT_KEY_MISSING' }, { status: 400 });
    }

    const provider = resolvePaymentProvider(order, body.provider);
    const cancelReason = String(body.cancelReason ?? '고객 요청 취소').slice(0, 200);
    const providerAdapter = getPaymentProviderAdapter(provider);
    const cancelled = await providerAdapter.cancelPayment({
      paymentReference: String(order.payment_key),
      reason: cancelReason,
      rawRequest: body as Record<string, unknown>,
    });

    if (!cancelled.ok) {
      return NextResponse.json({ error: cancelled.errorCode || 'PAYMENT_FAILED' }, { status: 500 });
    }

    const items = (Array.isArray(order.items) ? order.items : []) as OrderItem[];
    const now = new Date().toISOString();

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
        stock: Number(inventoryRow?.stock ?? 0) + qty,
        reserved: Number(inventoryRow?.reserved ?? 0),
        updated_at: now,
      });

      if (bookRow) {
        await supabaseAdmin
          .from('books')
          .update({
            sales_count: Math.max(0, Number(bookRow.sales_count ?? 0) - qty),
            updated_at: now,
          })
          .eq('isbn', isbn);
      }
    }

    await supabaseAdmin
      .from('orders')
      .update({
        status: 'cancelled_by_customer',
        shipping_address: mergeOrderPaymentMetadata(order.shipping_address, {
          provider,
          paymentReference: String(order.payment_key),
        }),
        cancelled_at: now,
        mileage_reverted_at: order.mileage_reverted_at ?? now,
        updated_at: now,
      })
      .eq('order_id', orderId);

    if (order.user_id && order.mileage_applied_at && !order.mileage_reverted_at) {
      const pointsUsed = Number(order.points_used ?? 0);
      const pointsEarned = Number(order.points_earned ?? 0);
      if (pointsUsed > 0) {
        await appendMileageLedger({
          userId: String(order.user_id),
          orderId,
          kind: 'cancel_restore',
          amount: pointsUsed,
        });
      }
      if (pointsEarned > 0) {
        await appendMileageLedger({
          userId: String(order.user_id),
          orderId,
          kind: 'cancel_revoke',
          amount: pointsEarned,
        });
      }
    }

    invalidateStoreBookListsAndHome();

    return NextResponse.json({ success: true, orderId, provider });
  } catch (e) {
    console.error('[api/order/cancel]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
