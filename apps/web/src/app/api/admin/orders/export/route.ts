import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
const MAX_EXPORT = 5000;

const STATUS_KO: Record<string, string> = {
  pending: '결제대기',
  paid: '결제완료',
  cancelled: '취소',
  failed: '결제실패',
  cancelled_by_customer: '고객취소',
  return_requested: '반품요청',
  return_completed: '반품완료',
  exchange_requested: '교환요청',
  exchange_completed: '교환완료',
};

const SHIPPING_KO: Record<string, string> = {
  ready: '배송준비',
  shipped: '배송중',
  delivered: '배송완료',
};

const RETURN_KO: Record<string, string> = {
  none: '',
  requested: '반품요청',
  completed: '반품완료',
};

function escapeCsvCell(value: string | number | null | undefined): string {
  const normalized = String(value ?? '').replace(/"/g, '""');
  return normalized.includes(',') || normalized.includes('"') || normalized.includes('\n')
    ? `"${normalized}"`
    : normalized;
}

// 한국 시간(Asia/Seoul)으로 변환
function toKstString(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
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
    // 한국 시간(UTC+9) 기준으로 날짜 범위 계산
    const fromDate = fromStr ? new Date(`${fromStr}T00:00:00+09:00`) : null;
    const toDate = toStr ? new Date(`${toStr}T23:59:59.999+09:00`) : null;
    const hasFromDate = !!fromDate && !Number.isNaN(fromDate.getTime());
    const hasToDate = !!toDate && !Number.isNaN(toDate.getTime());
    const hasStatusFilter = statusFilter && ALLOWED_STATUS.includes(statusFilter);

    let query = supabaseAdmin
      .from('orders')
      .select(
        'order_id, status, shipping_status, items, total_price, shipping_fee, points_used, points_earned, payable_amount, shipping_address, delivery_memo, promotion_code, promotion_label, promotion_discount, tracking_number, carrier, return_status, return_reason, created_at'
      )
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

      const totalPrice = Number(row.total_price ?? 0);
      const shippingFee = Number(row.shipping_fee ?? 0);
      const pointsUsed = Number(row.points_used ?? 0);
      const pointsEarned = Number(row.points_earned ?? 0);
      const promotionDiscount = Number(row.promotion_discount ?? shippingAddress.promotionDiscount ?? 0);
      const payableAmount = Number(
        row.payable_amount ?? totalPrice + shippingFee - promotionDiscount - pointsUsed
      );

      return {
        orderId: String(row.order_id ?? ''),
        status: STATUS_KO[String(row.status ?? '')] ?? String(row.status ?? ''),
        shippingStatus: SHIPPING_KO[String(row.shipping_status ?? '')] ?? String(row.shipping_status ?? ''),
        returnStatus: RETURN_KO[String(row.return_status ?? 'none')] ?? '',
        returnReason: String(row.return_reason ?? ''),
        items: Array.isArray(row.items)
          ? (row.items as Array<{ title?: string; isbn?: string; quantity?: number; unitPrice?: number }>)
          : [],
        totalPrice,
        shippingFee,
        pointsUsed,
        pointsEarned,
        payableAmount,
        promotionLabel:
          typeof row.promotion_label === 'string'
            ? row.promotion_label
            : typeof shippingAddress.promotionLabel === 'string'
              ? shippingAddress.promotionLabel
              : '',
        promotionCode:
          typeof row.promotion_code === 'string'
            ? row.promotion_code
            : typeof shippingAddress.promotionCode === 'string'
              ? shippingAddress.promotionCode
              : '',
        promotionDiscount,
        shippingAddress: {
          name: typeof shippingAddress.name === 'string' ? shippingAddress.name : '',
          address: typeof shippingAddress.address === 'string' ? shippingAddress.address : '',
          detailAddress: typeof shippingAddress.detailAddress === 'string' ? shippingAddress.detailAddress : '',
          phone: typeof shippingAddress.phone === 'string' ? shippingAddress.phone : '',
        },
        deliveryMemo:
          typeof row.delivery_memo === 'string'
            ? row.delivery_memo
            : typeof shippingAddress.deliveryMemo === 'string'
              ? shippingAddress.deliveryMemo
              : '',
        carrier: typeof row.carrier === 'string' ? row.carrier : '',
        trackingNumber: typeof row.tracking_number === 'string' ? row.tracking_number : '',
        createdAt: toKstString(row.created_at ?? null),
      };
    });

    const isTruncated = list.length >= MAX_EXPORT;

    const header = [
      '주문번호',
      '주문일시(KST)',
      '주문상태',
      '배송상태',
      '반품상태',
      '반품사유',
      '수령인',
      '연락처',
      '택배사',
      '송장번호',
      '주소',
      '상세주소',
      '배송메모',
      '상품정보',
      '총수량',
      '주문금액',
      '배송비',
      '프로모션명',
      '프로모션코드',
      '프로모션할인',
      '사용마일리지',
      '적립마일리지',
      '최종결제금액',
    ]
      .map(escapeCsvCell)
      .join(',');

    const rows = list.map((order) => {
      const addr = order.shippingAddress;
      const itemSummary = order.items
        .map((item) => `${item.title ?? item.isbn ?? ''} ${item.quantity ?? 0}권`)
        .join(' / ');
      const totalQty = order.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);

      return [
        order.orderId,
        order.createdAt,
        order.status,
        order.shippingStatus,
        order.returnStatus,
        order.returnReason,
        addr.name,
        addr.phone,
        order.carrier,
        order.trackingNumber,
        addr.address,
        addr.detailAddress,
        order.deliveryMemo,
        itemSummary,
        totalQty,
        order.totalPrice,
        order.shippingFee,
        order.promotionLabel,
        order.promotionCode,
        order.promotionDiscount,
        order.pointsUsed,
        order.pointsEarned,
        order.payableAmount,
      ]
        .map(escapeCsvCell)
        .join(',');
    });

    const bom = '\uFEFF';
    const csv = bom + header + '\n' + rows.join('\n');

    const responseHeaders: HeadersInit = {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="orders-export.csv"',
    };
    // 5000건 초과 잘림 경고를 응답 헤더로 알림
    if (isTruncated) {
      responseHeaders['X-Export-Truncated'] = 'true';
      responseHeaders['X-Export-Max'] = String(MAX_EXPORT);
    }

    return new NextResponse(csv, { status: 200, headers: responseHeaders });
  } catch (e) {
    console.error('[admin/orders/export GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
