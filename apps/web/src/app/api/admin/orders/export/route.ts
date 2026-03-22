import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUS = ['pending', 'paid', 'cancelled', 'failed', 'cancelled_by_customer', 'return_requested', 'return_completed'];
const MAX_EXPORT = 5000;

function escapeCsvCell(value: string | number): string {
  const s = String(value ?? '').replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

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
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') ?? '';
    const fromStr = searchParams.get('from') ?? '';
    const toStr = searchParams.get('to') ?? '';
    const fromDate = fromStr ? new Date(`${fromStr}T00:00:00.000Z`) : null;
    const toDate = toStr ? new Date(`${toStr}T23:59:59.999Z`) : null;
    const hasFromDate = !!fromDate && !Number.isNaN(fromDate.getTime());
    const hasToDate = !!toDate && !Number.isNaN(toDate.getTime());
    const hasStatusFilter = statusFilter && ALLOWED_STATUS.includes(statusFilter);

    let query = supabaseAdmin
      .from('orders')
      .select('order_id, status, shipping_status, items, total_price, shipping_fee, shipping_address, tracking_number, carrier, created_at')
      .order('created_at', { ascending: false })
      .limit(MAX_EXPORT);

    if (hasStatusFilter) query = query.eq('status', statusFilter);
    if (hasFromDate && fromDate) query = query.gte('created_at', fromDate.toISOString());
    if (hasToDate && toDate) query = query.lte('created_at', toDate.toISOString());

    const { data, error } = await query;
    if (error) {
      console.error('[admin/orders/export GET] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    const list = (data ?? []).map((row) => {
      const shippingAddress =
        row.shipping_address && typeof row.shipping_address === 'object' && !Array.isArray(row.shipping_address)
          ? (row.shipping_address as Record<string, unknown>)
          : {};

      return {
        orderId: String(row.order_id ?? ''),
        status: String(row.status ?? ''),
        shippingStatus: String(row.shipping_status ?? ''),
        items: Array.isArray(row.items)
          ? (row.items as Array<{ title?: string; isbn?: string; quantity?: number; unitPrice?: number }>)
          : [],
        totalPrice: Number(row.total_price ?? 0),
        shippingFee: Number(row.shipping_fee ?? 0),
        shippingAddress: {
          name: typeof shippingAddress.name === 'string' ? shippingAddress.name : '',
          address: typeof shippingAddress.address === 'string' ? shippingAddress.address : '',
          phone: typeof shippingAddress.phone === 'string' ? shippingAddress.phone : '',
        },
        carrier: typeof row.carrier === 'string' ? row.carrier : '',
        trackingNumber: typeof row.tracking_number === 'string' ? row.tracking_number : '',
        createdAt: row.created_at ?? '',
      };
    });

    const header = [
      '주문번호',
      '주문일시',
      '상태',
      '배송상태',
      '수령인',
      '연락처',
      '택배사',
      '송장번호',
      '주소',
      '상품정보',
      '수량',
      '주문금액',
      '배송비',
      '합계',
    ].map(escapeCsvCell).join(',');

    const rows = list.map((order) => {
      const addr = order.shippingAddress ?? { name: '', phone: '', address: '' };
      const itemSummary = order.items
        .map((item) => `${item.title ?? item.isbn ?? ''} ${item.quantity ?? 0}권`)
        .join(' / ');
      const totalQty = order.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
      const total = order.totalPrice + order.shippingFee;

      return [
        order.orderId,
        order.createdAt,
        order.status,
        order.shippingStatus,
        addr.name,
        addr.phone,
        order.carrier,
        order.trackingNumber,
        addr.address,
        itemSummary,
        totalQty,
        order.totalPrice,
        order.shippingFee,
        total,
      ].map(escapeCsvCell).join(',');
    });

    const bom = '\uFEFF';
    const csv = bom + header + '\n' + rows.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="orders-export.csv"',
      },
    });
  } catch (e) {
    console.error('[admin/orders/export GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
