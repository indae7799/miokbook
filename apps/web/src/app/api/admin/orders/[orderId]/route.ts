import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { invalidateStoreBookListsAndHome } from '@/lib/invalidate-store-book-lists';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const SHIPPING_STATUSES = ['ready', 'shipped', 'delivered'] as const;
type OrderItem = { isbn?: string; quantity?: number };

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const shippingStatus = body.shippingStatus as string | undefined;
    const returnStatusUpdate = body.returnStatus as string | undefined;
    const exchangeStatusUpdate = body.exchangeStatus as string | undefined;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });

    const items = ((order.items ?? []) as OrderItem[]).filter(Boolean);
    const now = new Date().toISOString();

    if (returnStatusUpdate === 'completed') {
      if (order.status !== 'return_requested' && order.return_status !== 'requested') {
        return NextResponse.json({ error: 'INVALID_STATE_FOR_RETURN_COMPLETE' }, { status: 400 });
      }

      for (const item of items) {
        const isbn = String(item.isbn ?? '').trim();
        const qty = Math.max(0, Math.min(100, Number(item.quantity) ?? 1));
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
          return_status: 'completed',
          status: 'return_completed',
          return_completed_at: now,
          updated_at: now,
        })
        .eq('order_id', orderId);

      invalidateStoreBookListsAndHome();
      return NextResponse.json({ ok: true });
    }

    if (exchangeStatusUpdate === 'completed') {
      if (order.status !== 'exchange_requested') {
        return NextResponse.json({ error: 'INVALID_STATE_FOR_EXCHANGE_COMPLETE' }, { status: 400 });
      }

      await supabaseAdmin
        .from('orders')
        .update({
          status: 'exchange_completed',
          exchange_completed_at: now,
          updated_at: now,
        })
        .eq('order_id', orderId);

      return NextResponse.json({ ok: true });
    }

    const updates: Record<string, unknown> = { updated_at: now };
    if (shippingStatus && SHIPPING_STATUSES.includes(shippingStatus as (typeof SHIPPING_STATUSES)[number])) {
      updates.shipping_status = shippingStatus;
      if (shippingStatus === 'delivered') updates.delivered_at = now;
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin.from('orders').update(updates).eq('order_id', orderId);
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/orders PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
