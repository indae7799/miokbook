import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const ALLOWED_STATUS = ['pending', 'paid', 'cancelled', 'failed', 'cancelled_by_customer', 'return_requested', 'return_completed'];
const MAX_EXPORT = 5000;

function escapeCsvCell(value: string): string {
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
    if (!adminDb) {
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

    let query: FirebaseFirestore.Query = adminDb.collection('orders');
    if (hasStatusFilter && !hasFromDate && !hasToDate) {
      query = query.where('status', '==', statusFilter);
    }
    if (hasFromDate && fromDate) {
      query = query.where('createdAt', '>=', fromDate);
    }
    if (hasToDate && toDate) {
      query = query.where('createdAt', '<=', toDate);
    }

    const snapshot = await (hasFromDate || hasToDate
      ? query.orderBy('createdAt', 'desc').limit(MAX_EXPORT).get()
      : query.limit(MAX_EXPORT).get());

    let list = snapshot.docs.map((doc) => {
      const d = doc.data();
      const createdAt = d.createdAt?.toDate?.() ?? null;
      return {
        orderId: String(d.orderId ?? doc.id),
        status: String(d.status ?? ''),
        shippingStatus: String(d.shippingStatus ?? ''),
        items: (d.items ?? []) as Array<{ title?: string; isbn?: string; quantity?: number; unitPrice?: number }>,
        totalPrice: Number(d.totalPrice ?? 0),
        shippingFee: Number(d.shippingFee ?? 0),
        shippingAddress: d.shippingAddress as { name?: string; address?: string; phone?: string } | undefined,
        createdAt: createdAt ? createdAt.toISOString() : '',
      };
    });

    if (hasStatusFilter && (hasFromDate || hasToDate)) {
      list = list.filter((o) => o.status === statusFilter);
    }
    list = list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const header = [
      '주문번호',
      '주문일시',
      '상태',
      '배송상태',
      '수취인',
      '연락처',
      '주소',
      '상품정보',
      '수량',
      '주문금액',
      '배송비',
      '합계',
    ].map(escapeCsvCell).join(',');

    const rows = list.map((o) => {
      const addr = o.shippingAddress ?? {};
      const name = addr.name ?? '';
      const phone = addr.phone ?? '';
      const address = addr.address ?? '';
      const itemSummary = o.items.map((i) => `${i.title ?? i.isbn ?? ''} ${i.quantity ?? 0}권`).join(' / ');
      const totalQty = o.items.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
      const total = o.totalPrice + o.shippingFee;
      return [
        o.orderId,
        o.createdAt,
        o.status,
        o.shippingStatus,
        name,
        phone,
        address,
        itemSummary,
        totalQty,
        o.totalPrice,
        o.shippingFee,
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
