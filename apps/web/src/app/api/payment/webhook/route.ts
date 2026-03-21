import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { invalidateStoreBookListsAndHome } from '@/lib/invalidate-store-book-lists';

export const dynamic = 'force-dynamic';

type OrderItem = { isbn?: string; quantity?: number };

export async function POST(request: Request) {
  try {
    const secret = process.env.TOSS_WEBHOOK_SECRET;
    if (secret) {
      const headerSecret =
        request.headers.get('x-tosspayments-webhook-secret') ??
        request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (headerSecret !== secret) {
        console.warn('[payment/webhook] Secret mismatch');
        return NextResponse.json({ received: true }, { status: 200 });
      }
    }

    const body = await request.json().catch(() => null);
    if (!body || body.eventType !== 'PAYMENT_STATUS_CHANGED') {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const data = body.data as { orderId?: string; status?: string };
    const orderId = data?.orderId;
    const status = data?.status;
    if (!orderId || !status) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const releaseStatuses = ['EXPIRED', 'ABORTED'];
    const cancelStatuses = ['CANCELED', 'PARTIAL_CANCELED'];
    if (!releaseStatuses.includes(status) && !cancelStatuses.includes(status)) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();
    if (error || !order) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const currentStatus = order.status as string;
    const terminalStatuses = ['cancelled', 'cancelled_by_customer', 'failed', 'returned'];
    if (terminalStatuses.includes(currentStatus)) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const items = ((order.items ?? []) as OrderItem[]).filter(Boolean);
    if (items.length === 0) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const now = new Date().toISOString();
    const newStatus = cancelStatuses.includes(status) ? 'cancelled' : status === 'EXPIRED' ? 'cancelled' : 'failed';

    for (const item of items) {
      const isbn = String(item.isbn ?? '').trim();
      const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
      if (!isbn) continue;

      const [{ data: inventoryRow }, { data: bookRow }] = await Promise.all([
        supabaseAdmin.from('inventory').select('*').eq('isbn', isbn).maybeSingle(),
        supabaseAdmin.from('books').select('sales_count').eq('isbn', isbn).maybeSingle(),
      ]);

      if (cancelStatuses.includes(status)) {
        const nextStock = Number(inventoryRow?.stock ?? 0) + qty;
        await supabaseAdmin.from('inventory').upsert({
          isbn,
          stock: nextStock,
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
      } else {
        await supabaseAdmin.from('inventory').upsert({
          isbn,
          stock: Number(inventoryRow?.stock ?? 0),
          reserved: Math.max(0, Number(inventoryRow?.reserved ?? 0) - qty),
          updated_at: now,
        });
      }
    }

    await supabaseAdmin
      .from('orders')
      .update({ status: newStatus, cancelled_at: now, updated_at: now })
      .eq('order_id', orderId);

    if (cancelStatuses.includes(status)) {
      invalidateStoreBookListsAndHome();
    }
  } catch (e) {
    console.error('[payment/webhook]', e);
  }
  return NextResponse.json({ received: true }, { status: 200 });
}
