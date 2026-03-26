import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveDisplayOrderId } from '@/lib/order-id';

export const dynamic = 'force-dynamic';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DEGRADED_MSG =
  '일부 데이터를 불러오지 못했습니다. Supabase 쿼리 또는 스키마 상태를 확인해주세요.';

export async function GET(request: Request) {
  if (!adminAuth) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const authHeader = request.headers.get('authorization');
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let decoded: { role?: string };
  try {
    decoded = (await adminAuth.verifyIdToken(idToken)) as { role?: string };
  } catch (e) {
    console.warn('[admin/dashboard] verifyIdToken failed', e);
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (decoded.role !== 'admin') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  const todayStart = startOfToday();
  const sevenDaysAgo = startOfDaysAgo(6);
  let degraded = false;

  const dayKeys: Record<string, { orderCount: number; revenue: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = startOfDaysAgo(i);
    dayKeys[d.toISOString().slice(0, 10)] = { orderCount: 0, revenue: 0 };
  }

  const [recentOrdersResult, lowStockResult, returnCountResult, weeklyPaidResult] = await Promise.allSettled([
    supabaseAdmin
      .from('orders')
      .select('order_id, display_order_id, shipping_address, status, total_price, shipping_fee, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('inventory')
      .select('isbn, stock')
      .lt('stock', 5)
      .order('stock', { ascending: true })
      .limit(10),
    supabaseAdmin
      .from('orders')
      .select('order_id', { count: 'exact', head: true })
      .eq('return_status', 'requested'),
    supabaseAdmin
      .from('orders')
      .select('order_id, total_price, shipping_fee, paid_at')
      .eq('status', 'paid')
      .gte('paid_at', sevenDaysAgo.toISOString()),
  ]);

  let recentOrders: { id: string; orderId?: string; displayOrderId?: string; status?: string; totalPrice?: number; shippingFee?: number; createdAt: string | null }[] = [];
  if (recentOrdersResult.status === 'fulfilled' && !recentOrdersResult.value.error) {
    recentOrders = (recentOrdersResult.value.data ?? []).map((row) => ({
      id: row.order_id,
      orderId: row.order_id,
      displayOrderId: resolveDisplayOrderId(row),
      status: row.status,
      totalPrice: row.total_price,
      shippingFee: row.shipping_fee,
      createdAt: row.created_at ?? null,
    }));
  } else {
    console.error('[dashboard] recentOrders failed', recentOrdersResult.status === 'fulfilled' ? recentOrdersResult.value.error : recentOrdersResult.reason);
    degraded = true;
  }

  let lowStockList: { isbn: string; stock: number; title?: string }[] = [];
  if (lowStockResult.status === 'fulfilled' && !lowStockResult.value.error) {
    const rows = (lowStockResult.value.data ?? []).map((row) => ({
      isbn: row.isbn,
      stock: Number(row.stock ?? 0),
    }));

    if (rows.length > 0) {
      const { data: books, error: booksError } = await supabaseAdmin
        .from('books')
        .select('isbn, title')
        .in('isbn', rows.map((row) => row.isbn));

      if (!booksError && books) {
        const titleByIsbn = new Map(books.map((row) => [row.isbn, row.title]));
        lowStockList = rows.map((row) => ({ ...row, title: titleByIsbn.get(row.isbn) }));
      } else {
        lowStockList = rows;
      }
    }
  } else {
    console.error('[dashboard] lowStock failed', lowStockResult.status === 'fulfilled' ? lowStockResult.value.error : lowStockResult.reason);
    degraded = true;
  }

  let returnRequestedCount = 0;
  if (returnCountResult.status === 'fulfilled' && !returnCountResult.value.error) {
    returnRequestedCount = returnCountResult.value.count ?? 0;
  } else {
    degraded = true;
  }

  let todayOrderCount = 0;
  let todayRevenue = 0;
  if (weeklyPaidResult.status === 'fulfilled' && !weeklyPaidResult.value.error) {
    for (const row of weeklyPaidResult.value.data ?? []) {
      const paidAt = row.paid_at ? new Date(row.paid_at) : null;
      if (!paidAt || Number.isNaN(paidAt.getTime())) continue;
      const key = paidAt.toISOString().slice(0, 10);
      if (dayKeys[key]) {
        dayKeys[key].orderCount++;
        dayKeys[key].revenue += Number(row.total_price ?? 0) + Number(row.shipping_fee ?? 0);
      }
      if (paidAt >= todayStart) {
        todayOrderCount++;
        todayRevenue += Number(row.total_price ?? 0) + Number(row.shipping_fee ?? 0);
      }
    }
  } else {
    degraded = true;
  }

  const dailyRevenue = Object.keys(dayKeys)
    .sort()
    .reverse()
    .map((date) => ({
      date,
      orderCount: dayKeys[date].orderCount,
      revenue: dayKeys[date].revenue,
    }));

  return NextResponse.json({
    todayOrderCount,
    todayRevenue,
    lowStockBooks: lowStockList,
    recentOrders,
    returnRequestedCount,
    dailyRevenue,
    degraded,
    ...(degraded ? { degradedMessage: DEGRADED_MSG } : {}),
  });
}
