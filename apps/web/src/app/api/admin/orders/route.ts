import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveDisplayOrderId } from '@/lib/order-id';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUS = [
  'pending',
  'paid',
  'cancelled',
  'failed',
  'cancelled_by_customer',
  'return_requested',
  'return_completed',
  'exchange_requested',
  'exchange_completed',
];
const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') ?? '';
    const fromStr = searchParams.get('from') ?? '';
    const toStr = searchParams.get('to') ?? '';
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE));
    // 한국 시간(UTC+9) 기준으로 날짜 범위 계산
    const fromDate = fromStr ? new Date(`${fromStr}T00:00:00+09:00`).toISOString() : null;
    const toDate = toStr ? new Date(`${toStr}T23:59:59.999+09:00`).toISOString() : null;
    const hasStatusFilter = statusFilter && ALLOWED_STATUS.includes(statusFilter);

    let query = supabaseAdmin.from('orders').select('*', { count: 'exact' });
    if (hasStatusFilter) query = query.eq('status', statusFilter);
    if (fromDate) query = query.gte('created_at', fromDate);
    if (toDate) query = query.lte('created_at', toDate);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) throw error;

    const items = (data ?? []).map((row) => {
      const shippingAddress =
        row.shipping_address && typeof row.shipping_address === 'object' && !Array.isArray(row.shipping_address)
          ? (row.shipping_address as Record<string, unknown>)
          : {};

      return {
      id: row.order_id,
      orderId: row.order_id,
      displayOrderId: resolveDisplayOrderId(row),
      userId: row.user_id,
      status: row.status,
      shippingStatus: row.shipping_status,
      items: row.items ?? [],
      totalPrice: row.total_price,
      shippingFee: row.shipping_fee,
      shippingAddress: row.shipping_address,
      deliveryMemo: row.delivery_memo ?? String(shippingAddress.deliveryMemo ?? ''),
      promotionCode: row.promotion_code ?? String(shippingAddress.promotionCode ?? ''),
      promotionLabel: row.promotion_label ?? String(shippingAddress.promotionLabel ?? ''),
      promotionDiscount: Number(row.promotion_discount ?? shippingAddress.promotionDiscount ?? 0),
      pointsUsed: Number(row.points_used ?? 0),
      pointsEarned: Number(row.points_earned ?? 0),
      payableAmount: Number(row.payable_amount ?? (Number(row.total_price ?? 0) + Number(row.shipping_fee ?? 0))),
      trackingNumber: row.tracking_number ?? null,
      carrier: row.carrier ?? null,
      createdAt: row.created_at ?? null,
      paidAt: row.paid_at ?? null,
      deliveredAt: row.delivered_at ?? null,
      returnStatus: row.return_status ?? 'none',
      returnReason: row.return_reason ?? null,
      exchangeReason: row.exchange_reason ?? null,
      };
    });

    const totalCount = count ?? 0;
    return NextResponse.json({
      items,
      totalCount,
      page,
      pageSize,
      hasNext: page * pageSize < totalCount,
    });
  } catch (e) {
    console.error('[admin/orders GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get('from') ?? '';
    const toStr = searchParams.get('to') ?? '';
    const statusFilter = searchParams.get('status') ?? '';
    if (!fromStr || !toStr) {
      return NextResponse.json({ error: 'DATE_RANGE_REQUIRED' }, { status: 400 });
    }

    const fromDate = new Date(`${fromStr}T00:00:00+09:00`).toISOString();
    const toDate = new Date(`${toStr}T23:59:59.999+09:00`).toISOString();

    let query = supabaseAdmin
      .from('orders')
      .select('order_id, status, return_status, items')
      .gte('created_at', fromDate)
      .lte('created_at', toDate);

    if (statusFilter && ALLOWED_STATUS.includes(statusFilter)) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query.limit(5000);
    if (error) throw error;

    const rows = data ?? [];
    const orderIds = rows.map((row) => row.order_id).filter(Boolean);
    if (orderIds.length === 0) {
      return NextResponse.json({ deletedCount: 0 });
    }

    const stockDelta = new Map<string, number>();
    const salesDelta = new Map<string, number>();

    for (const row of rows) {
      const items = Array.isArray(row.items) ? row.items as Array<Record<string, unknown>> : [];
      for (const item of items) {
        if (item.type === 'concert_ticket') continue;
        const isbn = String(item.isbn ?? '').trim();
        const qty = Math.max(0, Math.min(100, Number(item.quantity) || 0));
        if (!isbn || qty <= 0) continue;

        if (row.status === 'pending') {
          stockDelta.set(isbn, (stockDelta.get(isbn) ?? 0) - qty);
        } else if (row.status === 'paid' || row.status === 'return_requested' || row.status === 'exchange_requested' || row.status === 'exchange_completed') {
          stockDelta.set(isbn, (stockDelta.get(isbn) ?? 0) + qty);
          salesDelta.set(isbn, (salesDelta.get(isbn) ?? 0) - qty);
        } else if (row.return_status === 'completed' || row.status === 'return_completed') {
          // Already restored; no-op.
        }
      }
    }

    for (const [isbn, delta] of stockDelta.entries()) {
      const { data: inventoryRow } = await supabaseAdmin
        .from('inventory')
        .select('stock, reserved')
        .eq('isbn', isbn)
        .maybeSingle();

      await supabaseAdmin.from('inventory').upsert({
        isbn,
        stock: Math.max(0, Number(inventoryRow?.stock ?? 0) + (delta > 0 ? delta : 0)),
        reserved: Math.max(0, Number(inventoryRow?.reserved ?? 0) + (delta < 0 ? delta : 0)),
        updated_at: new Date().toISOString(),
      });
    }

    for (const [isbn, delta] of salesDelta.entries()) {
      const { data: bookRow } = await supabaseAdmin
        .from('books')
        .select('sales_count')
        .eq('isbn', isbn)
        .maybeSingle();
      await supabaseAdmin
        .from('books')
        .update({
          sales_count: Math.max(0, Number(bookRow?.sales_count ?? 0) + delta),
          updated_at: new Date().toISOString(),
        })
        .eq('isbn', isbn);
    }

    await supabaseAdmin.from('mileage_ledger').delete().in('order_id', orderIds);
    await supabaseAdmin.from('order_admin_logs').delete().in('order_id', orderIds);

    const { error: deleteError } = await supabaseAdmin.from('orders').delete().in('order_id', orderIds);
    if (deleteError) throw deleteError;

    return NextResponse.json({ deletedCount: orderIds.length });
  } catch (e) {
    console.error('[admin/orders DELETE]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
