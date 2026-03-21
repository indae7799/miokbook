import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { invalidateStoreBookListsAndHome } from '@/lib/invalidate-store-book-lists';

export const dynamic = 'force-dynamic';

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';

type OrderItem = { isbn?: string; quantity?: number };

function getSecretKey(): string {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) throw new Error('TOSS_NOT_CONFIGURED');
  return key;
}

async function callTossConfirm(paymentKey: string, orderId: string, amount: number): Promise<{ ok: true } | { ok: false }> {
  const secret = getSecretKey();
  const auth = Buffer.from(`${secret}:`, 'utf8').toString('base64');
  const res = await fetch(TOSS_CONFIRM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  if (!res.ok) {
    return { ok: false };
  }
  const data = await res.json();
  if (Number(data.totalAmount) !== amount) {
    return { ok: false };
  }
  return { ok: true };
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
    const paymentKey = body.paymentKey as string | undefined;
    const orderId = body.orderId as string | undefined;
    if (!paymentKey || !orderId) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
    }
    if (order.user_id !== decoded.uid) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, orderId, alreadyProcessed: true, status: 'paid' });
    }
    if (order.status !== 'pending') {
      return NextResponse.json({ success: true, orderId, alreadyProcessed: true, status: order.status });
    }

    const expiresTime = order.expires_at ? new Date(order.expires_at).getTime() : 0;
    if (!expiresTime || expiresTime <= Date.now()) {
      return NextResponse.json({ error: 'ORDER_EXPIRED' }, { status: 400 });
    }

    const expectedAmount = Number(order.total_price ?? 0) + Number(order.shipping_fee ?? 0);
    const items = (Array.isArray(order.items) ? order.items : []) as OrderItem[];
    const tossResult = await callTossConfirm(paymentKey, orderId, expectedAmount);
    const now = new Date().toISOString();

    if (!tossResult.ok) {
      for (const item of items) {
        const isbn = String(item.isbn ?? '');
        const qty = Math.max(1, Math.min(10, Number(item.quantity) ?? 1));
        if (!isbn) continue;

        const { data: inventoryRow } = await supabaseAdmin
          .from('inventory')
          .select('*')
          .eq('isbn', isbn)
          .maybeSingle();

        await supabaseAdmin.from('inventory').upsert({
          isbn,
          stock: Number(inventoryRow?.stock ?? 0),
          reserved: Math.max(0, Number(inventoryRow?.reserved ?? 0) - qty),
          updated_at: now,
        });
      }

      await supabaseAdmin
        .from('orders')
        .update({ status: 'failed', updated_at: now })
        .eq('order_id', orderId);

      return NextResponse.json({ error: 'PAYMENT_FAILED' }, { status: 400 });
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

      await supabaseAdmin
        .from('books')
        .update({
          sales_count: Number(bookRow?.sales_count ?? 0) + qty,
          updated_at: now,
        })
        .eq('isbn', isbn);
    }

    await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        payment_key: paymentKey,
        paid_at: now,
        updated_at: now,
      })
      .eq('order_id', orderId);

    invalidateStoreBookListsAndHome();

    return NextResponse.json({ success: true, orderId });
  } catch (e) {
    console.error('[api/payment/confirm]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
